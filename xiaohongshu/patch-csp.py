# -*- coding: utf-8 -*-
"""
把 Cocos 的 web-mobile 构建产物改造成小红书小工具可运行的包。

引擎里的三处动态代码生成在容器 CSP 下会被拦，必须换成等价的静态实现；
这类补丁随引擎版本走，单独成文件，升级 Cocos 后先跑一遍确认能匹配上。

用法：
    python patch-csp.py <源目录> <目标目录>
"""
import sys
import os

src = sys.argv[1] if len(sys.argv) > 1 else 'web-mobile'
dst = sys.argv[2] if len(sys.argv) > 2 else 'minitool'

os.makedirs(dst, exist_ok=True)

# ---------------------------------------------------------------- 1. cc.js
p_src = os.path.join(src, 'cocos-js', 'cc.js')
p_dst = os.path.join(dst, 'cocos-js', 'cc.js')
os.makedirs(os.path.dirname(p_dst), exist_ok=True)

# $P：生成组件的 start / update / lateUpdate 调度闭包，模块加载时无条件执行。
# 原实现用 Function(...) 现场编译，容器 CSP 不含 unsafe-eval，一加载就抛 EvalError。
ORIG = ('function $P(t,e,i){var n="var a=it.array;for(it.i=0;it.i<a.length;++it.i){var c=a[it.i];"'
        '+t+"}",r=e?Function("it","dt",n):Function("it",n);return tR(Function("c","dt",t),r,i)}')

PATCHED = (
 'function $P(t,e,i){var f,m=/^c\\.([A-Za-z_$][\\w$]*)\\(\\);c\\._objFlags\\|=(\\d+)$/.exec(t);'
 'if(m){var F=+m[2],A=m[1];f=function(c){c[A]();c._objFlags|=F}}'
 'else{var s0=t.replace(/;$/,""),m2=/^c\\.([A-Za-z_$][\\w$]*)\\(\\)$/.exec(s0),m3=/^c\\.([A-Za-z_$][\\w$]*)\\(dt\\)$/.exec(s0);'
 'if(m2){var B=m2[1];f=function(c){c[B]()}}'
 'else if(m3){var D=m3[1];f=function(c,dt){c[D](dt)}}'
 'else{throw new Error("CSP_NO_DYNAMIC_CODE:"+t)}}'
 'var r;if(e){r=function(it,dt){var a=it.array;for(it.i=0;it.i<a.length;++it.i){f(a[it.i],dt)}}}'
 'else{r=function(it){var a=it.array;for(it.i=0;it.i<a.length;++it.i){f(a[it.i])}}}'
 'return tR(f,r,i)}'
)

d = open(p_src, encoding='utf-8').read()
if d.count(ORIG) == 0:
    raise SystemExit('cc.js: $P 未匹配。引擎版本变了，需要重新定位这段并更新补丁。')
d = d.replace(ORIG, PATCHED)

# CCClass 默认值初始化器：原本用 Function("o", 赋值语句) 生成，改为返回静态赋值的闭包。
ORIG2 = ('var l="";for(i in s){var c;c=Ni.IDENTIFIER_RE.test(i)?"o."+i+"=":"o["+Ni.escapeForJS(i)+"]=";'
         'var f=s[i];""===f&&(f=\'""\'),l+=c+f+";\\n"}return Function("o",l)')
PATCHED2 = ('var kv=[];for(i in s){var f=s[i];""===f&&(f=\'""\'),kv.push(i,f)}'
            'return function(o){for(var q=0;q<kv.length;q+=2){var v=kv[q+1];'
            'o[kv[q]]=null===v?null:void 0===v?void 0:\'""\'===v?"":v}}')
n2 = d.count(ORIG2)
if n2 != 1:
    raise SystemExit(f'cc.js: 默认值初始化器匹配数={n2}（应为 1），引擎版本变了。')
d = d.replace(ORIG2, PATCHED2)

open(p_dst, 'w', encoding='utf-8').write(d)
print('  patched cc.js')

# ------------------------------------------------- 2. polyfills.bundle.js
p_poly_src = os.path.join(src, 'src', 'polyfills.bundle.js')
p_poly_dst = os.path.join(dst, 'src', 'polyfills.bundle.js')
os.makedirs(os.path.dirname(p_poly_dst), exist_ok=True)
e = open(p_poly_src, encoding='utf-8').read()

# core-js / regenerator 用 Function 回退拿全局对象，启动阶段就会执行
poly_pairs = [
    ('Function("r","regeneratorRuntime = r")(r)',
     '(typeof globalThis!=="undefined"?globalThis:window).regeneratorRuntime=r'),
    ('Function("return this")()',
     '(typeof globalThis!=="undefined"?globalThis:typeof self!=="undefined"?self:window)'),
]
for o, w in poly_pairs:
    if e.count(o) != 1:
        raise SystemExit(f'polyfills: 匹配数={e.count(o)} for {o[:40]}')
    e = e.replace(o, w)
open(p_poly_dst, 'w', encoding='utf-8').write(e)
print('  patched polyfills.bundle.js')
