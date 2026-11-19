"""Export integrated 5x5 character atlases. No runtime component compositing."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageFilter,ImageChops
import numpy as np
import json
ROOT=Path(__file__).resolve().parent
SPRITES=ROOT/'sprites';SPRITES.mkdir(exist_ok=True)
STATES=['neutral','portrait','tired','blink','idle']
FONT=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',14)
SMALL=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',11)
people=[];checks=[];all_images=[]
def clean(pic):
    a=np.array(pic.convert('RGBA'));a[a[:,:,3]<24]=0
    # Remove detached edge flecks without changing facial/garment interiors.
    mask=a[:,:,3]>0;seen=np.zeros(mask.shape,bool)
    for sy,sx in zip(*np.where(mask)):
        if seen[sy,sx]:continue
        stack=[(sy,sx)];seen[sy,sx]=True;coords=[]
        while stack:
            y,x=stack.pop();coords.append((y,x))
            for ny,nx in [(y-1,x),(y+1,x),(y,x-1),(y,x+1)]:
                if 0<=ny<mask.shape[0] and 0<=nx<mask.shape[1] and mask[ny,nx] and not seen[ny,nx]:seen[ny,nx]=True;stack.append((ny,nx))
        if len(coords)<14:
            for y,x in coords:a[y,x]=0
    return Image.fromarray(a)

for sex,prefix in [('male','m'),('female','f')]:
    sheet=Image.open(ROOT/f'sources/{sex}-atlas.png').convert('RGBA')
    for row in range(5):
        ident=f'{prefix}{row+1:02d}'
        raw=[clean(sheet.crop((round(col*sheet.width/5),round(row*sheet.height/5),round((col+1)*sheet.width/5),round((row+1)*sheet.height/5)))) for col in range(5)]
        b=raw[0].getchannel('A').getbbox();scale=224/(b[3]-b[1])
        dx=128-(b[0]+b[2])/2*scale;dy=240-b[3]*scale
        rendered=[];registrations=[]
        for col,pic in enumerate(raw):
            cb=pic.getchannel('A').getbbox()
            # Source atlas cell pitch has accumulated horizontal placement drift.
            # Correct translation only; one scale is retained for the whole row.
            tx=128-(cb[0]+cb[2])/2*scale;ty=240-cb[3]*scale
            p=pic.resize((round(pic.width*scale),round(pic.height*scale)),Image.Resampling.LANCZOS)
            out=Image.new('RGBA',(256,256));out.alpha_composite(p,(round(tx),round(ty)));rendered.append(out)
            registrations.append([tx,ty])
        entries={};bounds=[]
        for state,pic in zip(STATES,rendered):
            name=f'{ident}-{state}.png';pic.save(SPRITES/name)
            bounds.append(pic.getchannel('A').point(lambda a:255 if a>32 else 0).getbbox())
            entries[state]={'file':f'sprites/{name}'}
        drift=[max(abs(x-y) for x,y in zip(bb,bounds[0])) for bb in bounds]
        checks.append({'id':ident,'sourceCellBounds':b,'sharedScale':scale,'translationOnlyRegistration':dict(zip(STATES,registrations)),'stateAlphaBounds':dict(zip(STATES,bounds)),'maxSilhouetteEdgeDriftPx':max(drift),'status':'needs_visual_review'})
        people.append({'id':ident,'sex':sex,'states':entries,'avatarRect':{'x':24,'y':0,'width':208,'height':208},'deskLine':{'x':128,'y':240},'headTop':{'x':128,'y':16},'source':{'file':f'sources/{sex}-atlas.png','row':row}})
        all_images.append(rendered)

manifest={'version':1,'kind':'integrated-character-expressions','canvas':{'width':256,'height':256},'stateOrder':STATES,'characters':people,'status':'unreviewed'}
(ROOT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'checks.json').write_text(json.dumps({'characters':10,'sprites':50,'format':'256x256 RGBA','method':'one uniform scale per row, translation-only center and desk registration per state; no anatomy deformation','checks':checks},ensure_ascii=False,indent=2),encoding='utf-8')

def contact(size,avatar,file):
    cw=size+16;ch=size+25
    board=Image.new('RGB',(cw*5+62,ch*10+30),'#f5eedf');d=ImageDraw.Draw(board)
    for col,state in enumerate(STATES):d.text((65+col*cw,5),state,font=SMALL,fill='#594033')
    for row,(person,images) in enumerate(zip(people,all_images)):
        d.text((5,35+row*ch),person['id'],font=FONT,fill='#594033')
        for col,pic in enumerate(images):
            if avatar:pic=pic.crop((24,0,232,208))
            pic=pic.resize((size,size),Image.Resampling.LANCZOS)
            board.paste(pic,(62+col*cw,30+row*ch),pic)
    board.save(ROOT/file)
contact(72,True,'contact-avatars-72.png')
contact(256,False,'contact-full.png')

# Actual display-size workstations: same size per character across all expressions.
board=Image.new('RGB',(450,930),'#f5eedf');d=ImageDraw.Draw(board)
for c,s in enumerate(STATES):d.text((c*90+6,6),s,font=SMALL,fill='#594033')
for row,(person,images) in enumerate(zip(people,all_images)):
    for col,pic in enumerate(images):
        x=col*90;y=row*90+30
        small=pic.resize((64,64),Image.Resampling.LANCZOS)
        board.paste(small,(x+13,y),small)
        d.rounded_rectangle((x+8,y+54,x+82,y+78),radius=3,fill='#c99b63',outline='#79533d')
        d.rounded_rectangle((x+29,y+40,x+60,y+60),radius=2,fill='#594d43',outline='#3e3731')
        if col==0:d.text((x+4,y+79),person['id'],font=SMALL,fill='#594033')
board.save(ROOT/'contact-workstations.png')
print(json.dumps({'spriteCount':50,'maxEdgeDrift':max(c['maxSilhouetteEdgeDriftPx'] for c in checks),'driftByCharacter':{c['id']:c['maxSilhouetteEdgeDriftPx'] for c in checks}}))
