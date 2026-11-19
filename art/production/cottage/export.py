from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,json
ROOT=Path(__file__).resolve().parent
PARTS=ROOT/'parts';LAYERS=ROOT/'layers'
PARTS.mkdir(exist_ok=True);LAYERS.mkdir(exist_ok=True)
def largest(pic):
    a=np.array(pic.convert('RGBA'));a[a[:,:,3]<24]=0;mask=a[:,:,3]>0;seen=np.zeros(mask.shape,bool);best=[]
    for sy,sx in zip(*np.where(mask)):
        if seen[sy,sx]:continue
        todo=[(sy,sx)];seen[sy,sx]=1;coords=[]
        while todo:
            y,x=todo.pop();coords.append((y,x))
            for ny,nx in [(y-1,x),(y+1,x),(y,x-1),(y,x+1)]:
                if 0<=ny<mask.shape[0] and 0<=nx<mask.shape[1] and mask[ny,nx] and not seen[ny,nx]:seen[ny,nx]=1;todo.append((ny,nx))
        if len(coords)>len(best):best=coords
    keep=np.zeros(mask.shape,bool)
    for y,x in best:keep[y,x]=True
    a[~keep]=0;p=Image.fromarray(a);return p.crop(p.getchannel('A').getbbox())
atlas=Image.open(ROOT/'sources/furniture.png').convert('RGBA');w,h=atlas.size
boxes={'desk':(0,0,int(w*.6),int(h*.56)),'chair':(int(w*.6),0,w,int(h*.56)),'laptop-open':(0,int(h*.56),w//2,h),'laptop-closed':(w//2,int(h*.56),w,h)}
props={n:largest(atlas.crop(b)) for n,b in boxes.items()}
for n,p in props.items():p.save(PARTS/(n+'.png'))
room=Image.open(ROOT/'sources/room.png').convert('RGBA').resize((1200,570),Image.Resampling.LANCZOS)
# Only the empty architectural base is remapped; people/props retain rigid scale.
base=Image.new('RGBA',(1200,570));base.paste(room.crop((0,0,1200,350)).resize((1200,240),Image.Resampling.LANCZOS),(0,0));base.paste(room.crop((0,350,1200,570)).resize((1200,330),Image.Resampling.LANCZOS),(0,240))
base.save(LAYERS/'base.png')
def place(layer,pic,width,cx,y):
    height=round(pic.height*width/pic.width);p=pic.resize((width,height),Image.Resampling.LANCZOS);layer.alpha_composite(p,(round(cx-width/2),round(y)))
seats=[]
for row,desk_y in enumerate([315,475]):
    chairs=Image.new('RGBA',(1200,570));desks=chairs.copy()
    for col,cx in enumerate([330,875]):
        place(chairs,props['chair'],135,cx,desk_y-86)
        place(desks,props['desk'],400,cx,desk_y)
        seats.append({'id':f'seat-{row*2+col+1}','row':row,'deskAnchor':{'x':cx,'y':desk_y+32},'characterScale':.70,'deskWidth':400,'chairWidth':135,'laptop':{'x':cx-10,'y':desk_y+7,'width':125},'mug':{'x':cx+105,'y':desk_y+45,'width':42}})
    chairs.save(LAYERS/f'row-{row}-chairs.png');desks.save(LAYERS/f'row-{row}-desks.png')

demo=base.copy();ids=['m01','f01','m02',None]
for row in range(2):
    demo=Image.alpha_composite(demo,Image.open(LAYERS/f'row-{row}-chairs.png'))
    for seat,ident in zip(seats[row*2:row*2+2],ids[row*2:row*2+2]):
        if ident:
            person=Image.open(ROOT.parent/f'characters/sprites/{ident}-neutral.png').convert('RGBA');s=seat['characterScale'];size=round(256*s)
            demo.alpha_composite(person.resize((size,size),Image.Resampling.LANCZOS),(round(seat['deskAnchor']['x']-128*s),round(seat['deskAnchor']['y']-240*s)))
    demo=Image.alpha_composite(demo,Image.open(LAYERS/f'row-{row}-desks.png'))
    for seat,ident in zip(seats[row*2:row*2+2],ids[row*2:row*2+2]):
        if ident:
            pc=seat['laptop'];place(demo,props['laptop-open'],pc['width'],pc['x'],pc['y'])
            mug=Image.open(ROOT.parent/'cottage-runtime/masters/mug.png').convert('RGBA');mp=seat['mug'];place(demo,mug,mp['width'],mp['x'],mp['y'])
demo.save(ROOT/'preview-1200x570.png')
demo.crop((75,0,1125,570)).resize((350,190),Image.Resampling.LANCZOS).convert('RGB').save(ROOT/'preview-350x190.png')
short=Image.new('RGBA',(1200,360))
short.paste(base.crop((0,0,1200,240)).resize((1200,140),Image.Resampling.LANCZOS),(0,0))
short.paste(base.crop((0,240,1200,570)).resize((1200,220),Image.Resampling.LANCZOS),(0,140))
short_seats=[]
for row,desk_y in enumerate([190,290]):
    for col,cx in enumerate([330,875]):place(short,props['chair'],100,cx,desk_y-58)
    for col,cx in enumerate([330,875]):
        ident=ids[row*2+col];s=.42
        if ident:
            p=Image.open(ROOT.parent/f'characters/sprites/{ident}-neutral.png').convert('RGBA');size=round(256*s)
            short.alpha_composite(p.resize((size,size),Image.Resampling.LANCZOS),(round(cx-128*s),round(desk_y+22-240*s)))
        short_seats.append({'id':f'seat-{row*2+col+1}','row':row,'deskAnchor':{'x':cx,'y':desk_y+22},'characterScale':s,'deskWidth':340,'chairWidth':100})
    for col,cx in enumerate([330,875]):
        place(short,props['desk'],340,cx,desk_y)
        if ids[row*2+col]:place(short,props['laptop-open'],105,cx-10,desk_y+2)
short.save(ROOT/'preview-short-1200x360.png')
short.crop((75,0,1125,360)).resize((350,120),Image.Resampling.LANCZOS).convert('RGB').save(ROOT/'preview-350x120.png')
objects=[{'id':'project','rect':[257,31,414,139],'route':'project','tutorialAnchor':'project'},{'id':'rating','rect':[702,19,216,40],'route':'rating','tutorialAnchor':'rating'},{'id':'calendar','rect':[690,69,257,112],'route':'calendar','tutorialAnchor':'calendar'},{'id':'achievements','rect':[966,53,208,187],'route':'achievements','tutorialAnchor':'achievements'},{'id':'window','rect':[0,0,230,220],'route':None}]
layout={'version':1,'status':'unreviewed','canvas':[1200,570],'cropSafeSides':[75,75],'upperRect':[0,0,1200,240],'employeeRect':[0,240,1200,330],'seatCount':4,'demoOccupants':ids,'layers':['base','row-0-chairs','row-0-people','row-0-desks','row-0-laptops-mugs','row-1-chairs','row-1-people','row-1-desks','row-1-laptops-mugs'],'seats':seats,'objects':objects,'defaultSceneRoute':'team','labels':{'roomAndCount':[1050,530,100,32],'stateSymbols':'above character head'},'shortLayout':{'canvas':[1200,360],'upperHeight':140,'seats':short_seats,'method':'background zones only resize; characters and props use separate uniform scale and positions','minClickRectSourcePixels':72},'notes':['1200x570 source; 1050x570 central crop displayed 350x190','no star/date/trophy/program contents baked into base','chair and desk row layers contain exactly 2 objects each']}
(ROOT/'layout.json').write_text(json.dumps(layout,ensure_ascii=False,indent=2),encoding='utf-8')
print('4 desks, 4 chairs, 3 occupied + 1 empty; 1200x570 row layers exported')
