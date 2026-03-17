(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const s of a.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&n(s)}).observe(document,{childList:!0,subtree:!0});function t(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function n(r){if(r.ep)return;r.ep=!0;const a=t(r);fetch(r.href,a)}})();var Ur,nt,Sl,Rn,ro,El,yl,Tl,Rs,Ra,wa,Rr={},wr=[],Mc=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,Nr=Array.isArray;function fn(i,e){for(var t in e)i[t]=e[t];return i}function ws(i){i&&i.parentNode&&i.parentNode.removeChild(i)}function Sc(i,e,t){var n,r,a,s={};for(a in e)a=="key"?n=e[a]:a=="ref"?r=e[a]:s[a]=e[a];if(arguments.length>2&&(s.children=arguments.length>3?Ur.call(arguments,2):t),typeof i=="function"&&i.defaultProps!=null)for(a in i.defaultProps)s[a]===void 0&&(s[a]=i.defaultProps[a]);return vr(i,s,n,r,null)}function vr(i,e,t,n,r){var a={type:i,props:e,key:t,ref:n,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:r??++Sl,__i:-1,__u:0};return r==null&&nt.vnode!=null&&nt.vnode(a),a}function Fr(i){return i.children}function xr(i,e){this.props=i,this.context=e}function hi(i,e){if(e==null)return i.__?hi(i.__,i.__i+1):null;for(var t;e<i.__k.length;e++)if((t=i.__k[e])!=null&&t.__e!=null)return t.__e;return typeof i.type=="function"?hi(i):null}function Ec(i){if(i.__P&&i.__d){var e=i.__v,t=e.__e,n=[],r=[],a=fn({},e);a.__v=e.__v+1,nt.vnode&&nt.vnode(a),Cs(i.__P,a,e,i.__n,i.__P.namespaceURI,32&e.__u?[t]:null,n,t??hi(e),!!(32&e.__u),r),a.__v=e.__v,a.__.__k[a.__i]=a,wl(n,a,r),e.__e=e.__=null,a.__e!=t&&bl(a)}}function bl(i){if((i=i.__)!=null&&i.__c!=null)return i.__e=i.__c.base=null,i.__k.some(function(e){if(e!=null&&e.__e!=null)return i.__e=i.__c.base=e.__e}),bl(i)}function ao(i){(!i.__d&&(i.__d=!0)&&Rn.push(i)&&!Cr.__r++||ro!=nt.debounceRendering)&&((ro=nt.debounceRendering)||El)(Cr)}function Cr(){try{for(var i,e=1;Rn.length;)Rn.length>e&&Rn.sort(yl),i=Rn.shift(),e=Rn.length,Ec(i)}finally{Rn.length=Cr.__r=0}}function Al(i,e,t,n,r,a,s,o,c,l,f){var d,h,p,g,S,m,u,M=n&&n.__k||wr,b=e.length;for(c=yc(t,e,M,c,b),d=0;d<b;d++)(p=t.__k[d])!=null&&(h=p.__i!=-1&&M[p.__i]||Rr,p.__i=d,m=Cs(i,p,h,r,a,s,o,c,l,f),g=p.__e,p.ref&&h.ref!=p.ref&&(h.ref&&Ps(h.ref,null,p),f.push(p.ref,p.__c||g,p)),S==null&&g!=null&&(S=g),(u=!!(4&p.__u))||h.__k===p.__k?c=Rl(p,c,i,u):typeof p.type=="function"&&m!==void 0?c=m:g&&(c=g.nextSibling),p.__u&=-7);return t.__e=S,c}function yc(i,e,t,n,r){var a,s,o,c,l,f=t.length,d=f,h=0;for(i.__k=new Array(r),a=0;a<r;a++)(s=e[a])!=null&&typeof s!="boolean"&&typeof s!="function"?(typeof s=="string"||typeof s=="number"||typeof s=="bigint"||s.constructor==String?s=i.__k[a]=vr(null,s,null,null,null):Nr(s)?s=i.__k[a]=vr(Fr,{children:s},null,null,null):s.constructor===void 0&&s.__b>0?s=i.__k[a]=vr(s.type,s.props,s.key,s.ref?s.ref:null,s.__v):i.__k[a]=s,c=a+h,s.__=i,s.__b=i.__b+1,o=null,(l=s.__i=Tc(s,t,c,d))!=-1&&(d--,(o=t[l])&&(o.__u|=2)),o==null||o.__v==null?(l==-1&&(r>f?h--:r<f&&h++),typeof s.type!="function"&&(s.__u|=4)):l!=c&&(l==c-1?h--:l==c+1?h++:(l>c?h--:h++,s.__u|=4))):i.__k[a]=null;if(d)for(a=0;a<f;a++)(o=t[a])!=null&&!(2&o.__u)&&(o.__e==n&&(n=hi(o)),Pl(o,o));return n}function Rl(i,e,t,n){var r,a;if(typeof i.type=="function"){for(r=i.__k,a=0;r&&a<r.length;a++)r[a]&&(r[a].__=i,e=Rl(r[a],e,t,n));return e}i.__e!=e&&(n&&(e&&i.type&&!e.parentNode&&(e=hi(i)),t.insertBefore(i.__e,e||null)),e=i.__e);do e=e&&e.nextSibling;while(e!=null&&e.nodeType==8);return e}function Tc(i,e,t,n){var r,a,s,o=i.key,c=i.type,l=e[t],f=l!=null&&(2&l.__u)==0;if(l===null&&o==null||f&&o==l.key&&c==l.type)return t;if(n>(f?1:0)){for(r=t-1,a=t+1;r>=0||a<e.length;)if((l=e[s=r>=0?r--:a++])!=null&&!(2&l.__u)&&o==l.key&&c==l.type)return s}return-1}function so(i,e,t){e[0]=="-"?i.setProperty(e,t??""):i[e]=t==null?"":typeof t!="number"||Mc.test(e)?t:t+"px"}function Xi(i,e,t,n,r){var a,s;e:if(e=="style")if(typeof t=="string")i.style.cssText=t;else{if(typeof n=="string"&&(i.style.cssText=n=""),n)for(e in n)t&&e in t||so(i.style,e,"");if(t)for(e in t)n&&t[e]==n[e]||so(i.style,e,t[e])}else if(e[0]=="o"&&e[1]=="n")a=e!=(e=e.replace(Tl,"$1")),s=e.toLowerCase(),e=s in i||e=="onFocusOut"||e=="onFocusIn"?s.slice(2):e.slice(2),i.l||(i.l={}),i.l[e+a]=t,t?n?t.u=n.u:(t.u=Rs,i.addEventListener(e,a?wa:Ra,a)):i.removeEventListener(e,a?wa:Ra,a);else{if(r=="http://www.w3.org/2000/svg")e=e.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(e!="width"&&e!="height"&&e!="href"&&e!="list"&&e!="form"&&e!="tabIndex"&&e!="download"&&e!="rowSpan"&&e!="colSpan"&&e!="role"&&e!="popover"&&e in i)try{i[e]=t??"";break e}catch{}typeof t=="function"||(t==null||t===!1&&e[4]!="-"?i.removeAttribute(e):i.setAttribute(e,e=="popover"&&t==1?"":t))}}function oo(i){return function(e){if(this.l){var t=this.l[e.type+i];if(e.t==null)e.t=Rs++;else if(e.t<t.u)return;return t(nt.event?nt.event(e):e)}}}function Cs(i,e,t,n,r,a,s,o,c,l){var f,d,h,p,g,S,m,u,M,b,T,P,R,L,v,E=e.type;if(e.constructor!==void 0)return null;128&t.__u&&(c=!!(32&t.__u),a=[o=e.__e=t.__e]),(f=nt.__b)&&f(e);e:if(typeof E=="function")try{if(u=e.props,M=E.prototype&&E.prototype.render,b=(f=E.contextType)&&n[f.__c],T=f?b?b.props.value:f.__:n,t.__c?m=(d=e.__c=t.__c).__=d.__E:(M?e.__c=d=new E(u,T):(e.__c=d=new xr(u,T),d.constructor=E,d.render=Ac),b&&b.sub(d),d.state||(d.state={}),d.__n=n,h=d.__d=!0,d.__h=[],d._sb=[]),M&&d.__s==null&&(d.__s=d.state),M&&E.getDerivedStateFromProps!=null&&(d.__s==d.state&&(d.__s=fn({},d.__s)),fn(d.__s,E.getDerivedStateFromProps(u,d.__s))),p=d.props,g=d.state,d.__v=e,h)M&&E.getDerivedStateFromProps==null&&d.componentWillMount!=null&&d.componentWillMount(),M&&d.componentDidMount!=null&&d.__h.push(d.componentDidMount);else{if(M&&E.getDerivedStateFromProps==null&&u!==p&&d.componentWillReceiveProps!=null&&d.componentWillReceiveProps(u,T),e.__v==t.__v||!d.__e&&d.shouldComponentUpdate!=null&&d.shouldComponentUpdate(u,d.__s,T)===!1){e.__v!=t.__v&&(d.props=u,d.state=d.__s,d.__d=!1),e.__e=t.__e,e.__k=t.__k,e.__k.some(function(O){O&&(O.__=e)}),wr.push.apply(d.__h,d._sb),d._sb=[],d.__h.length&&s.push(d);break e}d.componentWillUpdate!=null&&d.componentWillUpdate(u,d.__s,T),M&&d.componentDidUpdate!=null&&d.__h.push(function(){d.componentDidUpdate(p,g,S)})}if(d.context=T,d.props=u,d.__P=i,d.__e=!1,P=nt.__r,R=0,M)d.state=d.__s,d.__d=!1,P&&P(e),f=d.render(d.props,d.state,d.context),wr.push.apply(d.__h,d._sb),d._sb=[];else do d.__d=!1,P&&P(e),f=d.render(d.props,d.state,d.context),d.state=d.__s;while(d.__d&&++R<25);d.state=d.__s,d.getChildContext!=null&&(n=fn(fn({},n),d.getChildContext())),M&&!h&&d.getSnapshotBeforeUpdate!=null&&(S=d.getSnapshotBeforeUpdate(p,g)),L=f!=null&&f.type===Fr&&f.key==null?Cl(f.props.children):f,o=Al(i,Nr(L)?L:[L],e,t,n,r,a,s,o,c,l),d.base=e.__e,e.__u&=-161,d.__h.length&&s.push(d),m&&(d.__E=d.__=null)}catch(O){if(e.__v=null,c||a!=null)if(O.then){for(e.__u|=c?160:128;o&&o.nodeType==8&&o.nextSibling;)o=o.nextSibling;a[a.indexOf(o)]=null,e.__e=o}else{for(v=a.length;v--;)ws(a[v]);Ca(e)}else e.__e=t.__e,e.__k=t.__k,O.then||Ca(e);nt.__e(O,e,t)}else a==null&&e.__v==t.__v?(e.__k=t.__k,e.__e=t.__e):o=e.__e=bc(t.__e,e,t,n,r,a,s,c,l);return(f=nt.diffed)&&f(e),128&e.__u?void 0:o}function Ca(i){i&&(i.__c&&(i.__c.__e=!0),i.__k&&i.__k.some(Ca))}function wl(i,e,t){for(var n=0;n<t.length;n++)Ps(t[n],t[++n],t[++n]);nt.__c&&nt.__c(e,i),i.some(function(r){try{i=r.__h,r.__h=[],i.some(function(a){a.call(r)})}catch(a){nt.__e(a,r.__v)}})}function Cl(i){return typeof i!="object"||i==null||i.__b>0?i:Nr(i)?i.map(Cl):fn({},i)}function bc(i,e,t,n,r,a,s,o,c){var l,f,d,h,p,g,S,m=t.props||Rr,u=e.props,M=e.type;if(M=="svg"?r="http://www.w3.org/2000/svg":M=="math"?r="http://www.w3.org/1998/Math/MathML":r||(r="http://www.w3.org/1999/xhtml"),a!=null){for(l=0;l<a.length;l++)if((p=a[l])&&"setAttribute"in p==!!M&&(M?p.localName==M:p.nodeType==3)){i=p,a[l]=null;break}}if(i==null){if(M==null)return document.createTextNode(u);i=document.createElementNS(r,M,u.is&&u),o&&(nt.__m&&nt.__m(e,a),o=!1),a=null}if(M==null)m===u||o&&i.data==u||(i.data=u);else{if(a=a&&Ur.call(i.childNodes),!o&&a!=null)for(m={},l=0;l<i.attributes.length;l++)m[(p=i.attributes[l]).name]=p.value;for(l in m)p=m[l],l=="dangerouslySetInnerHTML"?d=p:l=="children"||l in u||l=="value"&&"defaultValue"in u||l=="checked"&&"defaultChecked"in u||Xi(i,l,null,p,r);for(l in u)p=u[l],l=="children"?h=p:l=="dangerouslySetInnerHTML"?f=p:l=="value"?g=p:l=="checked"?S=p:o&&typeof p!="function"||m[l]===p||Xi(i,l,p,m[l],r);if(f)o||d&&(f.__html==d.__html||f.__html==i.innerHTML)||(i.innerHTML=f.__html),e.__k=[];else if(d&&(i.innerHTML=""),Al(e.type=="template"?i.content:i,Nr(h)?h:[h],e,t,n,M=="foreignObject"?"http://www.w3.org/1999/xhtml":r,a,s,a?a[0]:t.__k&&hi(t,0),o,c),a!=null)for(l=a.length;l--;)ws(a[l]);o||(l="value",M=="progress"&&g==null?i.removeAttribute("value"):g!=null&&(g!==i[l]||M=="progress"&&!g||M=="option"&&g!=m[l])&&Xi(i,l,g,m[l],r),l="checked",S!=null&&S!=i[l]&&Xi(i,l,S,m[l],r))}return i}function Ps(i,e,t){try{if(typeof i=="function"){var n=typeof i.__u=="function";n&&i.__u(),n&&e==null||(i.__u=i(e))}else i.current=e}catch(r){nt.__e(r,t)}}function Pl(i,e,t){var n,r;if(nt.unmount&&nt.unmount(i),(n=i.ref)&&(n.current&&n.current!=i.__e||Ps(n,null,e)),(n=i.__c)!=null){if(n.componentWillUnmount)try{n.componentWillUnmount()}catch(a){nt.__e(a,e)}n.base=n.__P=null}if(n=i.__k)for(r=0;r<n.length;r++)n[r]&&Pl(n[r],e,t||typeof i.type!="function");t||ws(i.__e),i.__c=i.__=i.__e=void 0}function Ac(i,e,t){return this.constructor(i,t)}function Rc(i,e,t){var n,r,a,s;e==document&&(e=document.documentElement),nt.__&&nt.__(i,e),r=(n=!1)?null:e.__k,a=[],s=[],Cs(e,i=e.__k=Sc(Fr,null,[i]),r||Rr,Rr,e.namespaceURI,r?null:e.firstChild?Ur.call(e.childNodes):null,a,r?r.__e:e.firstChild,n,s),wl(a,i,s)}Ur=wr.slice,nt={__e:function(i,e,t,n){for(var r,a,s;e=e.__;)if((r=e.__c)&&!r.__)try{if((a=r.constructor)&&a.getDerivedStateFromError!=null&&(r.setState(a.getDerivedStateFromError(i)),s=r.__d),r.componentDidCatch!=null&&(r.componentDidCatch(i,n||{}),s=r.__d),s)return r.__E=r}catch(o){i=o}throw i}},Sl=0,xr.prototype.setState=function(i,e){var t;t=this.__s!=null&&this.__s!=this.state?this.__s:this.__s=fn({},this.state),typeof i=="function"&&(i=i(fn({},t),this.props)),i&&fn(t,i),i!=null&&this.__v&&(e&&this._sb.push(e),ao(this))},xr.prototype.forceUpdate=function(i){this.__v&&(this.__e=!0,i&&this.__h.push(i),ao(this))},xr.prototype.render=Fr,Rn=[],El=typeof Promise=="function"?Promise.prototype.then.bind(Promise.resolve()):setTimeout,yl=function(i,e){return i.__v.__b-e.__v.__b},Cr.__r=0,Tl=/(PointerCapture)$|Capture$/i,Rs=0,Ra=oo(!1),wa=oo(!0);var wc=0;function A(i,e,t,n,r,a){e||(e={});var s,o,c=e;if("ref"in c)for(o in c={},e)o=="ref"?s=e[o]:c[o]=e[o];var l={type:i,props:c,key:t,ref:s,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:--wc,__i:-1,__u:0,__source:r,__self:a};if(typeof i=="function"&&(s=i.defaultProps))for(o in s)c[o]===void 0&&(c[o]=s[o]);return nt.vnode&&nt.vnode(l),l}var Di,ut,Wr,lo,Ii=0,Ll=[],ft=nt,co=ft.__b,uo=ft.__r,ho=ft.diffed,fo=ft.__c,po=ft.unmount,mo=ft.__;function Ls(i,e){ft.__h&&ft.__h(ut,i,Ii||e),Ii=0;var t=ut.__H||(ut.__H={__:[],__h:[]});return i>=t.__.length&&t.__.push({}),t.__[i]}function kn(i){return Ii=1,Cc(Il,i)}function Cc(i,e,t){var n=Ls(Di++,2);if(n.t=i,!n.__c&&(n.__=[Il(void 0,e),function(o){var c=n.__N?n.__N[0]:n.__[0],l=n.t(c,o);c!==l&&(n.__N=[l,n.__[1]],n.__c.setState({}))}],n.__c=ut,!ut.__f)){var r=function(o,c,l){if(!n.__c.__H)return!0;var f=n.__c.__H.__.filter(function(h){return h.__c});if(f.every(function(h){return!h.__N}))return!a||a.call(this,o,c,l);var d=n.__c.props!==o;return f.some(function(h){if(h.__N){var p=h.__[0];h.__=h.__N,h.__N=void 0,p!==h.__[0]&&(d=!0)}}),a&&a.call(this,o,c,l)||d};ut.__f=!0;var a=ut.shouldComponentUpdate,s=ut.componentWillUpdate;ut.componentWillUpdate=function(o,c,l){if(this.__e){var f=a;a=void 0,r(o,c,l),a=f}s&&s.call(this,o,c,l)},ut.shouldComponentUpdate=r}return n.__N||n.__}function Ds(i,e){var t=Ls(Di++,3);!ft.__s&&Dl(t.__H,e)&&(t.__=i,t.u=e,ut.__H.__h.push(t))}function qi(i){return Ii=5,Pr(function(){return{current:i}},[])}function Pr(i,e){var t=Ls(Di++,7);return Dl(t.__H,e)&&(t.__=i(),t.__H=e,t.__h=i),t.__}function Ui(i,e){return Ii=8,Pr(function(){return i},e)}function Pc(){for(var i;i=Ll.shift();){var e=i.__H;if(i.__P&&e)try{e.__h.some(Mr),e.__h.some(Pa),e.__h=[]}catch(t){e.__h=[],ft.__e(t,i.__v)}}}ft.__b=function(i){ut=null,co&&co(i)},ft.__=function(i,e){i&&e.__k&&e.__k.__m&&(i.__m=e.__k.__m),mo&&mo(i,e)},ft.__r=function(i){uo&&uo(i),Di=0;var e=(ut=i.__c).__H;e&&(Wr===ut?(e.__h=[],ut.__h=[],e.__.some(function(t){t.__N&&(t.__=t.__N),t.u=t.__N=void 0})):(e.__h.some(Mr),e.__h.some(Pa),e.__h=[],Di=0)),Wr=ut},ft.diffed=function(i){ho&&ho(i);var e=i.__c;e&&e.__H&&(e.__H.__h.length&&(Ll.push(e)!==1&&lo===ft.requestAnimationFrame||((lo=ft.requestAnimationFrame)||Lc)(Pc)),e.__H.__.some(function(t){t.u&&(t.__H=t.u),t.u=void 0})),Wr=ut=null},ft.__c=function(i,e){e.some(function(t){try{t.__h.some(Mr),t.__h=t.__h.filter(function(n){return!n.__||Pa(n)})}catch(n){e.some(function(r){r.__h&&(r.__h=[])}),e=[],ft.__e(n,t.__v)}}),fo&&fo(i,e)},ft.unmount=function(i){po&&po(i);var e,t=i.__c;t&&t.__H&&(t.__H.__.some(function(n){try{Mr(n)}catch(r){e=r}}),t.__H=void 0,e&&ft.__e(e,t.__v))};var _o=typeof requestAnimationFrame=="function";function Lc(i){var e,t=function(){clearTimeout(n),_o&&cancelAnimationFrame(e),setTimeout(i)},n=setTimeout(t,35);_o&&(e=requestAnimationFrame(t))}function Mr(i){var e=ut,t=i.__c;typeof t=="function"&&(i.__c=void 0,t()),ut=e}function Pa(i){var e=ut;i.__c=i.__(),ut=e}function Dl(i,e){return!i||i.length!==e.length||e.some(function(t,n){return t!==i[n]})}function Il(i,e){return typeof e=="function"?e(i):e}/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Is="183",Dc=0,go=1,Ic=2,Sr=1,Uc=2,Ci=3,Pn=0,wt=1,hn=2,mn=0,ui=1,vo=2,xo=3,Mo=4,Nc=5,Gn=100,Fc=101,Oc=102,Bc=103,zc=104,Gc=200,Vc=201,kc=202,Hc=203,La=204,Da=205,Wc=206,Xc=207,qc=208,Yc=209,$c=210,Kc=211,Zc=212,jc=213,Jc=214,Ia=0,Ua=1,Na=2,fi=3,Fa=4,Oa=5,Ba=6,za=7,Us=0,Qc=1,eu=2,Jt=0,Ul=1,Nl=2,Fl=3,Ol=4,Bl=5,zl=6,Gl=7,Vl=300,Xn=301,pi=302,Xr=303,qr=304,Or=306,Ga=1e3,pn=1001,Va=1002,Mt=1003,tu=1004,Yi=1005,bt=1006,Yr=1007,Hn=1008,It=1009,kl=1010,Hl=1011,Ni=1012,Ns=1013,tn=1014,Zt=1015,gn=1016,Fs=1017,Os=1018,Fi=1020,Wl=35902,Xl=35899,ql=1021,Yl=1022,Xt=1023,vn=1026,Wn=1027,$l=1028,Bs=1029,mi=1030,zs=1031,Gs=1033,Er=33776,yr=33777,Tr=33778,br=33779,ka=35840,Ha=35841,Wa=35842,Xa=35843,qa=36196,Ya=37492,$a=37496,Ka=37488,Za=37489,ja=37490,Ja=37491,Qa=37808,es=37809,ts=37810,ns=37811,is=37812,rs=37813,as=37814,ss=37815,os=37816,ls=37817,cs=37818,us=37819,ds=37820,hs=37821,fs=36492,ps=36494,ms=36495,_s=36283,gs=36284,vs=36285,xs=36286,nu=3200,Kl=0,iu=1,wn="",Ft="srgb",_i="srgb-linear",Lr="linear",je="srgb",$n=7680,So=519,ru=512,au=513,su=514,Vs=515,ou=516,lu=517,ks=518,cu=519,Eo=35044,yo="300 es",jt=2e3,Oi=2001;function uu(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function Bi(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function du(){const i=Bi("canvas");return i.style.display="block",i}const To={};function bo(...i){const e="THREE."+i.shift();console.log(e,...i)}function Zl(i){const e=i[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=i[1];t&&t.isStackTrace?i[0]+=" "+t.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function Le(...i){i=Zl(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...i)}}function We(...i){i=Zl(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...i)}}function Dr(...i){const e=i.join(" ");e in To||(To[e]=!0,Le(...i))}function hu(i,e,t){return new Promise(function(n,r){function a(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:r();break;case i.TIMEOUT_EXPIRED:setTimeout(a,t);break;default:n()}}setTimeout(a,t)})}const fu={[Ia]:Ua,[Na]:Ba,[Fa]:za,[fi]:Oa,[Ua]:Ia,[Ba]:Na,[za]:Fa,[Oa]:fi};class vi{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const r=n[e];if(r!==void 0){const a=r.indexOf(t);a!==-1&&r.splice(a,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const r=n.slice(0);for(let a=0,s=r.length;a<s;a++)r[a].call(this,e);e.target=null}}}const yt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],$r=Math.PI/180,Ms=180/Math.PI;function Gi(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(yt[i&255]+yt[i>>8&255]+yt[i>>16&255]+yt[i>>24&255]+"-"+yt[e&255]+yt[e>>8&255]+"-"+yt[e>>16&15|64]+yt[e>>24&255]+"-"+yt[t&63|128]+yt[t>>8&255]+"-"+yt[t>>16&255]+yt[t>>24&255]+yt[n&255]+yt[n>>8&255]+yt[n>>16&255]+yt[n>>24&255]).toLowerCase()}function ze(i,e,t){return Math.max(e,Math.min(t,i))}function pu(i,e){return(i%e+e)%e}function Kr(i,e,t){return(1-t)*i+t*e}function Ei(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function Ct(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}class Ye{constructor(e=0,t=0){Ye.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6],this.y=r[1]*t+r[4]*n+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=ze(this.x,e.x,t.x),this.y=ze(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=ze(this.x,e,t),this.y=ze(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(ze(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(ze(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),r=Math.sin(t),a=this.x-e.x,s=this.y-e.y;return this.x=a*n-s*r+e.x,this.y=a*r+s*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class xi{constructor(e=0,t=0,n=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=r}static slerpFlat(e,t,n,r,a,s,o){let c=n[r+0],l=n[r+1],f=n[r+2],d=n[r+3],h=a[s+0],p=a[s+1],g=a[s+2],S=a[s+3];if(d!==S||c!==h||l!==p||f!==g){let m=c*h+l*p+f*g+d*S;m<0&&(h=-h,p=-p,g=-g,S=-S,m=-m);let u=1-o;if(m<.9995){const M=Math.acos(m),b=Math.sin(M);u=Math.sin(u*M)/b,o=Math.sin(o*M)/b,c=c*u+h*o,l=l*u+p*o,f=f*u+g*o,d=d*u+S*o}else{c=c*u+h*o,l=l*u+p*o,f=f*u+g*o,d=d*u+S*o;const M=1/Math.sqrt(c*c+l*l+f*f+d*d);c*=M,l*=M,f*=M,d*=M}}e[t]=c,e[t+1]=l,e[t+2]=f,e[t+3]=d}static multiplyQuaternionsFlat(e,t,n,r,a,s){const o=n[r],c=n[r+1],l=n[r+2],f=n[r+3],d=a[s],h=a[s+1],p=a[s+2],g=a[s+3];return e[t]=o*g+f*d+c*p-l*h,e[t+1]=c*g+f*h+l*d-o*p,e[t+2]=l*g+f*p+o*h-c*d,e[t+3]=f*g-o*d-c*h-l*p,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,r){return this._x=e,this._y=t,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,r=e._y,a=e._z,s=e._order,o=Math.cos,c=Math.sin,l=o(n/2),f=o(r/2),d=o(a/2),h=c(n/2),p=c(r/2),g=c(a/2);switch(s){case"XYZ":this._x=h*f*d+l*p*g,this._y=l*p*d-h*f*g,this._z=l*f*g+h*p*d,this._w=l*f*d-h*p*g;break;case"YXZ":this._x=h*f*d+l*p*g,this._y=l*p*d-h*f*g,this._z=l*f*g-h*p*d,this._w=l*f*d+h*p*g;break;case"ZXY":this._x=h*f*d-l*p*g,this._y=l*p*d+h*f*g,this._z=l*f*g+h*p*d,this._w=l*f*d-h*p*g;break;case"ZYX":this._x=h*f*d-l*p*g,this._y=l*p*d+h*f*g,this._z=l*f*g-h*p*d,this._w=l*f*d+h*p*g;break;case"YZX":this._x=h*f*d+l*p*g,this._y=l*p*d+h*f*g,this._z=l*f*g-h*p*d,this._w=l*f*d-h*p*g;break;case"XZY":this._x=h*f*d-l*p*g,this._y=l*p*d-h*f*g,this._z=l*f*g+h*p*d,this._w=l*f*d+h*p*g;break;default:Le("Quaternion: .setFromEuler() encountered an unknown order: "+s)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,r=Math.sin(n);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],r=t[4],a=t[8],s=t[1],o=t[5],c=t[9],l=t[2],f=t[6],d=t[10],h=n+o+d;if(h>0){const p=.5/Math.sqrt(h+1);this._w=.25/p,this._x=(f-c)*p,this._y=(a-l)*p,this._z=(s-r)*p}else if(n>o&&n>d){const p=2*Math.sqrt(1+n-o-d);this._w=(f-c)/p,this._x=.25*p,this._y=(r+s)/p,this._z=(a+l)/p}else if(o>d){const p=2*Math.sqrt(1+o-n-d);this._w=(a-l)/p,this._x=(r+s)/p,this._y=.25*p,this._z=(c+f)/p}else{const p=2*Math.sqrt(1+d-n-o);this._w=(s-r)/p,this._x=(a+l)/p,this._y=(c+f)/p,this._z=.25*p}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(ze(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const r=Math.min(1,t/n);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,r=e._y,a=e._z,s=e._w,o=t._x,c=t._y,l=t._z,f=t._w;return this._x=n*f+s*o+r*l-a*c,this._y=r*f+s*c+a*o-n*l,this._z=a*f+s*l+n*c-r*o,this._w=s*f-n*o-r*c-a*l,this._onChangeCallback(),this}slerp(e,t){let n=e._x,r=e._y,a=e._z,s=e._w,o=this.dot(e);o<0&&(n=-n,r=-r,a=-a,s=-s,o=-o);let c=1-t;if(o<.9995){const l=Math.acos(o),f=Math.sin(l);c=Math.sin(c*l)/f,t=Math.sin(t*l)/f,this._x=this._x*c+n*t,this._y=this._y*c+r*t,this._z=this._z*c+a*t,this._w=this._w*c+s*t,this._onChangeCallback()}else this._x=this._x*c+n*t,this._y=this._y*c+r*t,this._z=this._z*c+a*t,this._w=this._w*c+s*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),a=Math.sqrt(n);return this.set(r*Math.sin(e),r*Math.cos(e),a*Math.sin(t),a*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class B{constructor(e=0,t=0,n=0){B.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Ao.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Ao.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,r=this.z,a=e.elements;return this.x=a[0]*t+a[3]*n+a[6]*r,this.y=a[1]*t+a[4]*n+a[7]*r,this.z=a[2]*t+a[5]*n+a[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,r=this.z,a=e.elements,s=1/(a[3]*t+a[7]*n+a[11]*r+a[15]);return this.x=(a[0]*t+a[4]*n+a[8]*r+a[12])*s,this.y=(a[1]*t+a[5]*n+a[9]*r+a[13])*s,this.z=(a[2]*t+a[6]*n+a[10]*r+a[14])*s,this}applyQuaternion(e){const t=this.x,n=this.y,r=this.z,a=e.x,s=e.y,o=e.z,c=e.w,l=2*(s*r-o*n),f=2*(o*t-a*r),d=2*(a*n-s*t);return this.x=t+c*l+s*d-o*f,this.y=n+c*f+o*l-a*d,this.z=r+c*d+a*f-s*l,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,r=this.z,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*r,this.y=a[1]*t+a[5]*n+a[9]*r,this.z=a[2]*t+a[6]*n+a[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=ze(this.x,e.x,t.x),this.y=ze(this.y,e.y,t.y),this.z=ze(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=ze(this.x,e,t),this.y=ze(this.y,e,t),this.z=ze(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(ze(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,r=e.y,a=e.z,s=t.x,o=t.y,c=t.z;return this.x=r*c-a*o,this.y=a*s-n*c,this.z=n*o-r*s,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Zr.copy(this).projectOnVector(e),this.sub(Zr)}reflect(e){return this.sub(Zr.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(ze(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,r=this.z-e.z;return t*t+n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const r=Math.sin(t)*e;return this.x=r*Math.sin(n),this.y=Math.cos(t)*e,this.z=r*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Zr=new B,Ao=new xi;class Ue{constructor(e,t,n,r,a,s,o,c,l){Ue.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,r,a,s,o,c,l)}set(e,t,n,r,a,s,o,c,l){const f=this.elements;return f[0]=e,f[1]=r,f[2]=o,f[3]=t,f[4]=a,f[5]=c,f[6]=n,f[7]=s,f[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,r=t.elements,a=this.elements,s=n[0],o=n[3],c=n[6],l=n[1],f=n[4],d=n[7],h=n[2],p=n[5],g=n[8],S=r[0],m=r[3],u=r[6],M=r[1],b=r[4],T=r[7],P=r[2],R=r[5],L=r[8];return a[0]=s*S+o*M+c*P,a[3]=s*m+o*b+c*R,a[6]=s*u+o*T+c*L,a[1]=l*S+f*M+d*P,a[4]=l*m+f*b+d*R,a[7]=l*u+f*T+d*L,a[2]=h*S+p*M+g*P,a[5]=h*m+p*b+g*R,a[8]=h*u+p*T+g*L,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],r=e[2],a=e[3],s=e[4],o=e[5],c=e[6],l=e[7],f=e[8];return t*s*f-t*o*l-n*a*f+n*o*c+r*a*l-r*s*c}invert(){const e=this.elements,t=e[0],n=e[1],r=e[2],a=e[3],s=e[4],o=e[5],c=e[6],l=e[7],f=e[8],d=f*s-o*l,h=o*c-f*a,p=l*a-s*c,g=t*d+n*h+r*p;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const S=1/g;return e[0]=d*S,e[1]=(r*l-f*n)*S,e[2]=(o*n-r*s)*S,e[3]=h*S,e[4]=(f*t-r*c)*S,e[5]=(r*a-o*t)*S,e[6]=p*S,e[7]=(n*c-l*t)*S,e[8]=(s*t-n*a)*S,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,r,a,s,o){const c=Math.cos(a),l=Math.sin(a);return this.set(n*c,n*l,-n*(c*s+l*o)+s+e,-r*l,r*c,-r*(-l*s+c*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(jr.makeScale(e,t)),this}rotate(e){return this.premultiply(jr.makeRotation(-e)),this}translate(e,t){return this.premultiply(jr.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let r=0;r<9;r++)if(t[r]!==n[r])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const jr=new Ue,Ro=new Ue().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),wo=new Ue().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function mu(){const i={enabled:!0,workingColorSpace:_i,spaces:{},convert:function(r,a,s){return this.enabled===!1||a===s||!a||!s||(this.spaces[a].transfer===je&&(r.r=_n(r.r),r.g=_n(r.g),r.b=_n(r.b)),this.spaces[a].primaries!==this.spaces[s].primaries&&(r.applyMatrix3(this.spaces[a].toXYZ),r.applyMatrix3(this.spaces[s].fromXYZ)),this.spaces[s].transfer===je&&(r.r=di(r.r),r.g=di(r.g),r.b=di(r.b))),r},workingToColorSpace:function(r,a){return this.convert(r,this.workingColorSpace,a)},colorSpaceToWorking:function(r,a){return this.convert(r,a,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===wn?Lr:this.spaces[r].transfer},getToneMappingMode:function(r){return this.spaces[r].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(r,a=this.workingColorSpace){return r.fromArray(this.spaces[a].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,a,s){return r.copy(this.spaces[a].toXYZ).multiply(this.spaces[s].fromXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(r,a){return Dr("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(r,a)},toWorkingColorSpace:function(r,a){return Dr("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(r,a)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[_i]:{primaries:e,whitePoint:n,transfer:Lr,toXYZ:Ro,fromXYZ:wo,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Ft},outputColorSpaceConfig:{drawingBufferColorSpace:Ft}},[Ft]:{primaries:e,whitePoint:n,transfer:je,toXYZ:Ro,fromXYZ:wo,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Ft}}}),i}const Xe=mu();function _n(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function di(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let Kn;class _u{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{Kn===void 0&&(Kn=Bi("canvas")),Kn.width=e.width,Kn.height=e.height;const r=Kn.getContext("2d");e instanceof ImageData?r.putImageData(e,0,0):r.drawImage(e,0,0,e.width,e.height),n=Kn}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Bi("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const r=n.getImageData(0,0,e.width,e.height),a=r.data;for(let s=0;s<a.length;s++)a[s]=_n(a[s]/255)*255;return n.putImageData(r,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(_n(t[n]/255)*255):t[n]=_n(t[n]);return{data:t,width:e.width,height:e.height}}else return Le("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let gu=0;class Hs{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:gu++}),this.uuid=Gi(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},r=this.data;if(r!==null){let a;if(Array.isArray(r)){a=[];for(let s=0,o=r.length;s<o;s++)r[s].isDataTexture?a.push(Jr(r[s].image)):a.push(Jr(r[s]))}else a=Jr(r);n.url=a}return t||(e.images[this.uuid]=n),n}}function Jr(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?_u.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(Le("Texture: Unable to serialize Texture."),{})}let vu=0;const Qr=new B;class At extends vi{constructor(e=At.DEFAULT_IMAGE,t=At.DEFAULT_MAPPING,n=pn,r=pn,a=bt,s=Hn,o=Xt,c=It,l=At.DEFAULT_ANISOTROPY,f=wn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:vu++}),this.uuid=Gi(),this.name="",this.source=new Hs(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=r,this.magFilter=a,this.minFilter=s,this.anisotropy=l,this.format=o,this.internalFormat=null,this.type=c,this.offset=new Ye(0,0),this.repeat=new Ye(1,1),this.center=new Ye(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ue,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=f,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(Qr).x}get height(){return this.source.getSize(Qr).y}get depth(){return this.source.getSize(Qr).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const n=e[t];if(n===void 0){Le(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){Le(`Texture.setValues(): property '${t}' does not exist.`);continue}r&&n&&r.isVector2&&n.isVector2||r&&n&&r.isVector3&&n.isVector3||r&&n&&r.isMatrix3&&n.isMatrix3?r.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Vl)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Ga:e.x=e.x-Math.floor(e.x);break;case pn:e.x=e.x<0?0:1;break;case Va:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Ga:e.y=e.y-Math.floor(e.y);break;case pn:e.y=e.y<0?0:1;break;case Va:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}At.DEFAULT_IMAGE=null;At.DEFAULT_MAPPING=Vl;At.DEFAULT_ANISOTROPY=1;class ot{constructor(e=0,t=0,n=0,r=1){ot.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,r=this.z,a=this.w,s=e.elements;return this.x=s[0]*t+s[4]*n+s[8]*r+s[12]*a,this.y=s[1]*t+s[5]*n+s[9]*r+s[13]*a,this.z=s[2]*t+s[6]*n+s[10]*r+s[14]*a,this.w=s[3]*t+s[7]*n+s[11]*r+s[15]*a,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,r,a;const c=e.elements,l=c[0],f=c[4],d=c[8],h=c[1],p=c[5],g=c[9],S=c[2],m=c[6],u=c[10];if(Math.abs(f-h)<.01&&Math.abs(d-S)<.01&&Math.abs(g-m)<.01){if(Math.abs(f+h)<.1&&Math.abs(d+S)<.1&&Math.abs(g+m)<.1&&Math.abs(l+p+u-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const b=(l+1)/2,T=(p+1)/2,P=(u+1)/2,R=(f+h)/4,L=(d+S)/4,v=(g+m)/4;return b>T&&b>P?b<.01?(n=0,r=.707106781,a=.707106781):(n=Math.sqrt(b),r=R/n,a=L/n):T>P?T<.01?(n=.707106781,r=0,a=.707106781):(r=Math.sqrt(T),n=R/r,a=v/r):P<.01?(n=.707106781,r=.707106781,a=0):(a=Math.sqrt(P),n=L/a,r=v/a),this.set(n,r,a,t),this}let M=Math.sqrt((m-g)*(m-g)+(d-S)*(d-S)+(h-f)*(h-f));return Math.abs(M)<.001&&(M=1),this.x=(m-g)/M,this.y=(d-S)/M,this.z=(h-f)/M,this.w=Math.acos((l+p+u-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=ze(this.x,e.x,t.x),this.y=ze(this.y,e.y,t.y),this.z=ze(this.z,e.z,t.z),this.w=ze(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=ze(this.x,e,t),this.y=ze(this.y,e,t),this.z=ze(this.z,e,t),this.w=ze(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(ze(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class xu extends vi{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:bt,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new ot(0,0,e,t),this.scissorTest=!1,this.viewport=new ot(0,0,e,t),this.textures=[];const r={width:e,height:t,depth:n.depth},a=new At(r),s=n.count;for(let o=0;o<s;o++)this.textures[o]=a.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(e={}){const t={minFilter:bt,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let r=0,a=this.textures.length;r<a;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=n,this.textures[r].isData3DTexture!==!0&&(this.textures[r].isArrayTexture=this.textures[r].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const r=Object.assign({},e.textures[t].image);this.textures[t].source=new Hs(r)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Qt extends xu{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class jl extends At{constructor(e=null,t=1,n=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=Mt,this.minFilter=Mt,this.wrapR=pn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class Mu extends At{constructor(e=null,t=1,n=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=Mt,this.minFilter=Mt,this.wrapR=pn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class at{constructor(e,t,n,r,a,s,o,c,l,f,d,h,p,g,S,m){at.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,r,a,s,o,c,l,f,d,h,p,g,S,m)}set(e,t,n,r,a,s,o,c,l,f,d,h,p,g,S,m){const u=this.elements;return u[0]=e,u[4]=t,u[8]=n,u[12]=r,u[1]=a,u[5]=s,u[9]=o,u[13]=c,u[2]=l,u[6]=f,u[10]=d,u[14]=h,u[3]=p,u[7]=g,u[11]=S,u[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new at().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinant()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinant()===0)return this.identity();const t=this.elements,n=e.elements,r=1/Zn.setFromMatrixColumn(e,0).length(),a=1/Zn.setFromMatrixColumn(e,1).length(),s=1/Zn.setFromMatrixColumn(e,2).length();return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=0,t[4]=n[4]*a,t[5]=n[5]*a,t[6]=n[6]*a,t[7]=0,t[8]=n[8]*s,t[9]=n[9]*s,t[10]=n[10]*s,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,r=e.y,a=e.z,s=Math.cos(n),o=Math.sin(n),c=Math.cos(r),l=Math.sin(r),f=Math.cos(a),d=Math.sin(a);if(e.order==="XYZ"){const h=s*f,p=s*d,g=o*f,S=o*d;t[0]=c*f,t[4]=-c*d,t[8]=l,t[1]=p+g*l,t[5]=h-S*l,t[9]=-o*c,t[2]=S-h*l,t[6]=g+p*l,t[10]=s*c}else if(e.order==="YXZ"){const h=c*f,p=c*d,g=l*f,S=l*d;t[0]=h+S*o,t[4]=g*o-p,t[8]=s*l,t[1]=s*d,t[5]=s*f,t[9]=-o,t[2]=p*o-g,t[6]=S+h*o,t[10]=s*c}else if(e.order==="ZXY"){const h=c*f,p=c*d,g=l*f,S=l*d;t[0]=h-S*o,t[4]=-s*d,t[8]=g+p*o,t[1]=p+g*o,t[5]=s*f,t[9]=S-h*o,t[2]=-s*l,t[6]=o,t[10]=s*c}else if(e.order==="ZYX"){const h=s*f,p=s*d,g=o*f,S=o*d;t[0]=c*f,t[4]=g*l-p,t[8]=h*l+S,t[1]=c*d,t[5]=S*l+h,t[9]=p*l-g,t[2]=-l,t[6]=o*c,t[10]=s*c}else if(e.order==="YZX"){const h=s*c,p=s*l,g=o*c,S=o*l;t[0]=c*f,t[4]=S-h*d,t[8]=g*d+p,t[1]=d,t[5]=s*f,t[9]=-o*f,t[2]=-l*f,t[6]=p*d+g,t[10]=h-S*d}else if(e.order==="XZY"){const h=s*c,p=s*l,g=o*c,S=o*l;t[0]=c*f,t[4]=-d,t[8]=l*f,t[1]=h*d+S,t[5]=s*f,t[9]=p*d-g,t[2]=g*d-p,t[6]=o*f,t[10]=S*d+h}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Su,e,Eu)}lookAt(e,t,n){const r=this.elements;return Lt.subVectors(e,t),Lt.lengthSq()===0&&(Lt.z=1),Lt.normalize(),Sn.crossVectors(n,Lt),Sn.lengthSq()===0&&(Math.abs(n.z)===1?Lt.x+=1e-4:Lt.z+=1e-4,Lt.normalize(),Sn.crossVectors(n,Lt)),Sn.normalize(),$i.crossVectors(Lt,Sn),r[0]=Sn.x,r[4]=$i.x,r[8]=Lt.x,r[1]=Sn.y,r[5]=$i.y,r[9]=Lt.y,r[2]=Sn.z,r[6]=$i.z,r[10]=Lt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,r=t.elements,a=this.elements,s=n[0],o=n[4],c=n[8],l=n[12],f=n[1],d=n[5],h=n[9],p=n[13],g=n[2],S=n[6],m=n[10],u=n[14],M=n[3],b=n[7],T=n[11],P=n[15],R=r[0],L=r[4],v=r[8],E=r[12],O=r[1],w=r[5],k=r[9],z=r[13],Y=r[2],V=r[6],H=r[10],N=r[14],te=r[3],j=r[7],he=r[11],J=r[15];return a[0]=s*R+o*O+c*Y+l*te,a[4]=s*L+o*w+c*V+l*j,a[8]=s*v+o*k+c*H+l*he,a[12]=s*E+o*z+c*N+l*J,a[1]=f*R+d*O+h*Y+p*te,a[5]=f*L+d*w+h*V+p*j,a[9]=f*v+d*k+h*H+p*he,a[13]=f*E+d*z+h*N+p*J,a[2]=g*R+S*O+m*Y+u*te,a[6]=g*L+S*w+m*V+u*j,a[10]=g*v+S*k+m*H+u*he,a[14]=g*E+S*z+m*N+u*J,a[3]=M*R+b*O+T*Y+P*te,a[7]=M*L+b*w+T*V+P*j,a[11]=M*v+b*k+T*H+P*he,a[15]=M*E+b*z+T*N+P*J,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],r=e[8],a=e[12],s=e[1],o=e[5],c=e[9],l=e[13],f=e[2],d=e[6],h=e[10],p=e[14],g=e[3],S=e[7],m=e[11],u=e[15],M=c*p-l*h,b=o*p-l*d,T=o*h-c*d,P=s*p-l*f,R=s*h-c*f,L=s*d-o*f;return t*(S*M-m*b+u*T)-n*(g*M-m*P+u*R)+r*(g*b-S*P+u*L)-a*(g*T-S*R+m*L)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],r=e[2],a=e[3],s=e[4],o=e[5],c=e[6],l=e[7],f=e[8],d=e[9],h=e[10],p=e[11],g=e[12],S=e[13],m=e[14],u=e[15],M=t*o-n*s,b=t*c-r*s,T=t*l-a*s,P=n*c-r*o,R=n*l-a*o,L=r*l-a*c,v=f*S-d*g,E=f*m-h*g,O=f*u-p*g,w=d*m-h*S,k=d*u-p*S,z=h*u-p*m,Y=M*z-b*k+T*w+P*O-R*E+L*v;if(Y===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const V=1/Y;return e[0]=(o*z-c*k+l*w)*V,e[1]=(r*k-n*z-a*w)*V,e[2]=(S*L-m*R+u*P)*V,e[3]=(h*R-d*L-p*P)*V,e[4]=(c*O-s*z-l*E)*V,e[5]=(t*z-r*O+a*E)*V,e[6]=(m*T-g*L-u*b)*V,e[7]=(f*L-h*T+p*b)*V,e[8]=(s*k-o*O+l*v)*V,e[9]=(n*O-t*k-a*v)*V,e[10]=(g*R-S*T+u*M)*V,e[11]=(d*T-f*R-p*M)*V,e[12]=(o*E-s*w-c*v)*V,e[13]=(t*w-n*E+r*v)*V,e[14]=(S*b-g*P-m*M)*V,e[15]=(f*P-d*b+h*M)*V,this}scale(e){const t=this.elements,n=e.x,r=e.y,a=e.z;return t[0]*=n,t[4]*=r,t[8]*=a,t[1]*=n,t[5]*=r,t[9]*=a,t[2]*=n,t[6]*=r,t[10]*=a,t[3]*=n,t[7]*=r,t[11]*=a,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,r))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),r=Math.sin(t),a=1-n,s=e.x,o=e.y,c=e.z,l=a*s,f=a*o;return this.set(l*s+n,l*o-r*c,l*c+r*o,0,l*o+r*c,f*o+n,f*c-r*s,0,l*c-r*o,f*c+r*s,a*c*c+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,r,a,s){return this.set(1,n,a,0,e,1,s,0,t,r,1,0,0,0,0,1),this}compose(e,t,n){const r=this.elements,a=t._x,s=t._y,o=t._z,c=t._w,l=a+a,f=s+s,d=o+o,h=a*l,p=a*f,g=a*d,S=s*f,m=s*d,u=o*d,M=c*l,b=c*f,T=c*d,P=n.x,R=n.y,L=n.z;return r[0]=(1-(S+u))*P,r[1]=(p+T)*P,r[2]=(g-b)*P,r[3]=0,r[4]=(p-T)*R,r[5]=(1-(h+u))*R,r[6]=(m+M)*R,r[7]=0,r[8]=(g+b)*L,r[9]=(m-M)*L,r[10]=(1-(h+S))*L,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){const r=this.elements;e.x=r[12],e.y=r[13],e.z=r[14];const a=this.determinant();if(a===0)return n.set(1,1,1),t.identity(),this;let s=Zn.set(r[0],r[1],r[2]).length();const o=Zn.set(r[4],r[5],r[6]).length(),c=Zn.set(r[8],r[9],r[10]).length();a<0&&(s=-s),Vt.copy(this);const l=1/s,f=1/o,d=1/c;return Vt.elements[0]*=l,Vt.elements[1]*=l,Vt.elements[2]*=l,Vt.elements[4]*=f,Vt.elements[5]*=f,Vt.elements[6]*=f,Vt.elements[8]*=d,Vt.elements[9]*=d,Vt.elements[10]*=d,t.setFromRotationMatrix(Vt),n.x=s,n.y=o,n.z=c,this}makePerspective(e,t,n,r,a,s,o=jt,c=!1){const l=this.elements,f=2*a/(t-e),d=2*a/(n-r),h=(t+e)/(t-e),p=(n+r)/(n-r);let g,S;if(c)g=a/(s-a),S=s*a/(s-a);else if(o===jt)g=-(s+a)/(s-a),S=-2*s*a/(s-a);else if(o===Oi)g=-s/(s-a),S=-s*a/(s-a);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=f,l[4]=0,l[8]=h,l[12]=0,l[1]=0,l[5]=d,l[9]=p,l[13]=0,l[2]=0,l[6]=0,l[10]=g,l[14]=S,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,n,r,a,s,o=jt,c=!1){const l=this.elements,f=2/(t-e),d=2/(n-r),h=-(t+e)/(t-e),p=-(n+r)/(n-r);let g,S;if(c)g=1/(s-a),S=s/(s-a);else if(o===jt)g=-2/(s-a),S=-(s+a)/(s-a);else if(o===Oi)g=-1/(s-a),S=-a/(s-a);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=f,l[4]=0,l[8]=0,l[12]=h,l[1]=0,l[5]=d,l[9]=0,l[13]=p,l[2]=0,l[6]=0,l[10]=g,l[14]=S,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let r=0;r<16;r++)if(t[r]!==n[r])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const Zn=new B,Vt=new at,Su=new B(0,0,0),Eu=new B(1,1,1),Sn=new B,$i=new B,Lt=new B,Co=new at,Po=new xi;class nn{constructor(e=0,t=0,n=0,r=nn.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,r=this._order){return this._x=e,this._y=t,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const r=e.elements,a=r[0],s=r[4],o=r[8],c=r[1],l=r[5],f=r[9],d=r[2],h=r[6],p=r[10];switch(t){case"XYZ":this._y=Math.asin(ze(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-f,p),this._z=Math.atan2(-s,a)):(this._x=Math.atan2(h,l),this._z=0);break;case"YXZ":this._x=Math.asin(-ze(f,-1,1)),Math.abs(f)<.9999999?(this._y=Math.atan2(o,p),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-d,a),this._z=0);break;case"ZXY":this._x=Math.asin(ze(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(-d,p),this._z=Math.atan2(-s,l)):(this._y=0,this._z=Math.atan2(c,a));break;case"ZYX":this._y=Math.asin(-ze(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(h,p),this._z=Math.atan2(c,a)):(this._x=0,this._z=Math.atan2(-s,l));break;case"YZX":this._z=Math.asin(ze(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-f,l),this._y=Math.atan2(-d,a)):(this._x=0,this._y=Math.atan2(o,p));break;case"XZY":this._z=Math.asin(-ze(s,-1,1)),Math.abs(s)<.9999999?(this._x=Math.atan2(h,l),this._y=Math.atan2(o,a)):(this._x=Math.atan2(-f,p),this._y=0);break;default:Le("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return Co.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Co,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Po.setFromEuler(this),this.setFromQuaternion(Po,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}nn.DEFAULT_ORDER="XYZ";class Ws{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let yu=0;const Lo=new B,jn=new xi,on=new at,Ki=new B,yi=new B,Tu=new B,bu=new xi,Do=new B(1,0,0),Io=new B(0,1,0),Uo=new B(0,0,1),No={type:"added"},Au={type:"removed"},Jn={type:"childadded",child:null},ea={type:"childremoved",child:null};class St extends vi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:yu++}),this.uuid=Gi(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=St.DEFAULT_UP.clone();const e=new B,t=new nn,n=new xi,r=new B(1,1,1);function a(){n.setFromEuler(t,!1)}function s(){t.setFromQuaternion(n,void 0,!1)}t._onChange(a),n._onChange(s),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new at},normalMatrix:{value:new Ue}}),this.matrix=new at,this.matrixWorld=new at,this.matrixAutoUpdate=St.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=St.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Ws,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return jn.setFromAxisAngle(e,t),this.quaternion.multiply(jn),this}rotateOnWorldAxis(e,t){return jn.setFromAxisAngle(e,t),this.quaternion.premultiply(jn),this}rotateX(e){return this.rotateOnAxis(Do,e)}rotateY(e){return this.rotateOnAxis(Io,e)}rotateZ(e){return this.rotateOnAxis(Uo,e)}translateOnAxis(e,t){return Lo.copy(e).applyQuaternion(this.quaternion),this.position.add(Lo.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Do,e)}translateY(e){return this.translateOnAxis(Io,e)}translateZ(e){return this.translateOnAxis(Uo,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(on.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?Ki.copy(e):Ki.set(e,t,n);const r=this.parent;this.updateWorldMatrix(!0,!1),yi.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?on.lookAt(yi,Ki,this.up):on.lookAt(Ki,yi,this.up),this.quaternion.setFromRotationMatrix(on),r&&(on.extractRotation(r.matrixWorld),jn.setFromRotationMatrix(on),this.quaternion.premultiply(jn.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(We("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(No),Jn.child=e,this.dispatchEvent(Jn),Jn.child=null):We("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Au),ea.child=e,this.dispatchEvent(ea),ea.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),on.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),on.multiply(e.parent.matrixWorld)),e.applyMatrix4(on),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(No),Jn.child=e,this.dispatchEvent(Jn),Jn.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,r=this.children.length;n<r;n++){const s=this.children[n].getObjectByProperty(e,t);if(s!==void 0)return s}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const r=this.children;for(let a=0,s=r.length;a<s;a++)r[a].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(yi,e,Tu),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(yi,bu,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,n=e.y,r=e.z,a=this.matrix.elements;a[12]+=t-a[0]*t-a[4]*n-a[8]*r,a[13]+=n-a[1]*t-a[5]*n-a[9]*r,a[14]+=r-a[2]*t-a[6]*n-a[10]*r}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){const n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const r=this.children;for(let a=0,s=r.length;a<s;a++)r[a].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),this.static!==!1&&(r.static=this.static),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.pivot!==null&&(r.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(r.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(r.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(o=>({...o})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function a(o,c){return o[c.uuid]===void 0&&(o[c.uuid]=c.toJSON(e)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=a(e.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const c=o.shapes;if(Array.isArray(c))for(let l=0,f=c.length;l<f;l++){const d=c[l];a(e.shapes,d)}else a(e.shapes,c)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(a(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let c=0,l=this.material.length;c<l;c++)o.push(a(e.materials,this.material[c]));r.material=o}else r.material=a(e.materials,this.material);if(this.children.length>0){r.children=[];for(let o=0;o<this.children.length;o++)r.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let o=0;o<this.animations.length;o++){const c=this.animations[o];r.animations.push(a(e.animations,c))}}if(t){const o=s(e.geometries),c=s(e.materials),l=s(e.textures),f=s(e.images),d=s(e.shapes),h=s(e.skeletons),p=s(e.animations),g=s(e.nodes);o.length>0&&(n.geometries=o),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),f.length>0&&(n.images=f),d.length>0&&(n.shapes=d),h.length>0&&(n.skeletons=h),p.length>0&&(n.animations=p),g.length>0&&(n.nodes=g)}return n.object=r,n;function s(o){const c=[];for(const l in o){const f=o[l];delete f.metadata,c.push(f)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),e.pivot!==null&&(this.pivot=e.pivot.clone()),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const r=e.children[n];this.add(r.clone())}return this}}St.DEFAULT_UP=new B(0,1,0);St.DEFAULT_MATRIX_AUTO_UPDATE=!0;St.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class Zi extends St{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Ru={type:"move"};class ta{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Zi,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Zi,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new B,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new B),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Zi,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new B,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new B),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let r=null,a=null,s=null;const o=this._targetRay,c=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(l&&e.hand){s=!0;for(const S of e.hand.values()){const m=t.getJointPose(S,n),u=this._getHandJoint(l,S);m!==null&&(u.matrix.fromArray(m.transform.matrix),u.matrix.decompose(u.position,u.rotation,u.scale),u.matrixWorldNeedsUpdate=!0,u.jointRadius=m.radius),u.visible=m!==null}const f=l.joints["index-finger-tip"],d=l.joints["thumb-tip"],h=f.position.distanceTo(d.position),p=.02,g=.005;l.inputState.pinching&&h>p+g?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&h<=p-g&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(a=t.getPose(e.gripSpace,n),a!==null&&(c.matrix.fromArray(a.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,a.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(a.linearVelocity)):c.hasLinearVelocity=!1,a.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(a.angularVelocity)):c.hasAngularVelocity=!1));o!==null&&(r=t.getPose(e.targetRaySpace,n),r===null&&a!==null&&(r=a),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Ru)))}return o!==null&&(o.visible=r!==null),c!==null&&(c.visible=a!==null),l!==null&&(l.visible=s!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new Zi;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}const Jl={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},En={h:0,s:0,l:0},ji={h:0,s:0,l:0};function na(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class Ge{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Ft){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Xe.colorSpaceToWorking(this,t),this}setRGB(e,t,n,r=Xe.workingColorSpace){return this.r=e,this.g=t,this.b=n,Xe.colorSpaceToWorking(this,r),this}setHSL(e,t,n,r=Xe.workingColorSpace){if(e=pu(e,1),t=ze(t,0,1),n=ze(n,0,1),t===0)this.r=this.g=this.b=n;else{const a=n<=.5?n*(1+t):n+t-n*t,s=2*n-a;this.r=na(s,a,e+1/3),this.g=na(s,a,e),this.b=na(s,a,e-1/3)}return Xe.colorSpaceToWorking(this,r),this}setStyle(e,t=Ft){function n(a){a!==void 0&&parseFloat(a)<1&&Le("Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let a;const s=r[1],o=r[2];switch(s){case"rgb":case"rgba":if(a=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(a[4]),this.setRGB(Math.min(255,parseInt(a[1],10))/255,Math.min(255,parseInt(a[2],10))/255,Math.min(255,parseInt(a[3],10))/255,t);if(a=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(a[4]),this.setRGB(Math.min(100,parseInt(a[1],10))/100,Math.min(100,parseInt(a[2],10))/100,Math.min(100,parseInt(a[3],10))/100,t);break;case"hsl":case"hsla":if(a=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(a[4]),this.setHSL(parseFloat(a[1])/360,parseFloat(a[2])/100,parseFloat(a[3])/100,t);break;default:Le("Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){const a=r[1],s=a.length;if(s===3)return this.setRGB(parseInt(a.charAt(0),16)/15,parseInt(a.charAt(1),16)/15,parseInt(a.charAt(2),16)/15,t);if(s===6)return this.setHex(parseInt(a,16),t);Le("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Ft){const n=Jl[e.toLowerCase()];return n!==void 0?this.setHex(n,t):Le("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=_n(e.r),this.g=_n(e.g),this.b=_n(e.b),this}copyLinearToSRGB(e){return this.r=di(e.r),this.g=di(e.g),this.b=di(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Ft){return Xe.workingToColorSpace(Tt.copy(this),e),Math.round(ze(Tt.r*255,0,255))*65536+Math.round(ze(Tt.g*255,0,255))*256+Math.round(ze(Tt.b*255,0,255))}getHexString(e=Ft){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Xe.workingColorSpace){Xe.workingToColorSpace(Tt.copy(this),t);const n=Tt.r,r=Tt.g,a=Tt.b,s=Math.max(n,r,a),o=Math.min(n,r,a);let c,l;const f=(o+s)/2;if(o===s)c=0,l=0;else{const d=s-o;switch(l=f<=.5?d/(s+o):d/(2-s-o),s){case n:c=(r-a)/d+(r<a?6:0);break;case r:c=(a-n)/d+2;break;case a:c=(n-r)/d+4;break}c/=6}return e.h=c,e.s=l,e.l=f,e}getRGB(e,t=Xe.workingColorSpace){return Xe.workingToColorSpace(Tt.copy(this),t),e.r=Tt.r,e.g=Tt.g,e.b=Tt.b,e}getStyle(e=Ft){Xe.workingToColorSpace(Tt.copy(this),e);const t=Tt.r,n=Tt.g,r=Tt.b;return e!==Ft?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(r*255)})`}offsetHSL(e,t,n){return this.getHSL(En),this.setHSL(En.h+e,En.s+t,En.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(En),e.getHSL(ji);const n=Kr(En.h,ji.h,t),r=Kr(En.s,ji.s,t),a=Kr(En.l,ji.l,t);return this.setHSL(n,r,a),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,r=this.b,a=e.elements;return this.r=a[0]*t+a[3]*n+a[6]*r,this.g=a[1]*t+a[4]*n+a[7]*r,this.b=a[2]*t+a[5]*n+a[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Tt=new Ge;Ge.NAMES=Jl;class wu extends St{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new nn,this.environmentIntensity=1,this.environmentRotation=new nn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}const kt=new B,ln=new B,ia=new B,cn=new B,Qn=new B,ei=new B,Fo=new B,ra=new B,aa=new B,sa=new B,oa=new ot,la=new ot,ca=new ot;class Wt{constructor(e=new B,t=new B,n=new B){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,r){r.subVectors(n,t),kt.subVectors(e,t),r.cross(kt);const a=r.lengthSq();return a>0?r.multiplyScalar(1/Math.sqrt(a)):r.set(0,0,0)}static getBarycoord(e,t,n,r,a){kt.subVectors(r,t),ln.subVectors(n,t),ia.subVectors(e,t);const s=kt.dot(kt),o=kt.dot(ln),c=kt.dot(ia),l=ln.dot(ln),f=ln.dot(ia),d=s*l-o*o;if(d===0)return a.set(0,0,0),null;const h=1/d,p=(l*c-o*f)*h,g=(s*f-o*c)*h;return a.set(1-p-g,g,p)}static containsPoint(e,t,n,r){return this.getBarycoord(e,t,n,r,cn)===null?!1:cn.x>=0&&cn.y>=0&&cn.x+cn.y<=1}static getInterpolation(e,t,n,r,a,s,o,c){return this.getBarycoord(e,t,n,r,cn)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(a,cn.x),c.addScaledVector(s,cn.y),c.addScaledVector(o,cn.z),c)}static getInterpolatedAttribute(e,t,n,r,a,s){return oa.setScalar(0),la.setScalar(0),ca.setScalar(0),oa.fromBufferAttribute(e,t),la.fromBufferAttribute(e,n),ca.fromBufferAttribute(e,r),s.setScalar(0),s.addScaledVector(oa,a.x),s.addScaledVector(la,a.y),s.addScaledVector(ca,a.z),s}static isFrontFacing(e,t,n,r){return kt.subVectors(n,t),ln.subVectors(e,t),kt.cross(ln).dot(r)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,r){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,n,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return kt.subVectors(this.c,this.b),ln.subVectors(this.a,this.b),kt.cross(ln).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return Wt.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return Wt.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,r,a){return Wt.getInterpolation(e,this.a,this.b,this.c,t,n,r,a)}containsPoint(e){return Wt.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return Wt.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,r=this.b,a=this.c;let s,o;Qn.subVectors(r,n),ei.subVectors(a,n),ra.subVectors(e,n);const c=Qn.dot(ra),l=ei.dot(ra);if(c<=0&&l<=0)return t.copy(n);aa.subVectors(e,r);const f=Qn.dot(aa),d=ei.dot(aa);if(f>=0&&d<=f)return t.copy(r);const h=c*d-f*l;if(h<=0&&c>=0&&f<=0)return s=c/(c-f),t.copy(n).addScaledVector(Qn,s);sa.subVectors(e,a);const p=Qn.dot(sa),g=ei.dot(sa);if(g>=0&&p<=g)return t.copy(a);const S=p*l-c*g;if(S<=0&&l>=0&&g<=0)return o=l/(l-g),t.copy(n).addScaledVector(ei,o);const m=f*g-p*d;if(m<=0&&d-f>=0&&p-g>=0)return Fo.subVectors(a,r),o=(d-f)/(d-f+(p-g)),t.copy(r).addScaledVector(Fo,o);const u=1/(m+S+h);return s=S*u,o=h*u,t.copy(n).addScaledVector(Qn,s).addScaledVector(ei,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}class Vi{constructor(e=new B(1/0,1/0,1/0),t=new B(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(Ht.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(Ht.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=Ht.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const a=n.getAttribute("position");if(t===!0&&a!==void 0&&e.isInstancedMesh!==!0)for(let s=0,o=a.count;s<o;s++)e.isMesh===!0?e.getVertexPosition(s,Ht):Ht.fromBufferAttribute(a,s),Ht.applyMatrix4(e.matrixWorld),this.expandByPoint(Ht);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Ji.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Ji.copy(n.boundingBox)),Ji.applyMatrix4(e.matrixWorld),this.union(Ji)}const r=e.children;for(let a=0,s=r.length;a<s;a++)this.expandByObject(r[a],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Ht),Ht.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Ti),Qi.subVectors(this.max,Ti),ti.subVectors(e.a,Ti),ni.subVectors(e.b,Ti),ii.subVectors(e.c,Ti),yn.subVectors(ni,ti),Tn.subVectors(ii,ni),In.subVectors(ti,ii);let t=[0,-yn.z,yn.y,0,-Tn.z,Tn.y,0,-In.z,In.y,yn.z,0,-yn.x,Tn.z,0,-Tn.x,In.z,0,-In.x,-yn.y,yn.x,0,-Tn.y,Tn.x,0,-In.y,In.x,0];return!ua(t,ti,ni,ii,Qi)||(t=[1,0,0,0,1,0,0,0,1],!ua(t,ti,ni,ii,Qi))?!1:(er.crossVectors(yn,Tn),t=[er.x,er.y,er.z],ua(t,ti,ni,ii,Qi))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Ht).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Ht).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(un[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),un[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),un[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),un[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),un[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),un[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),un[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),un[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(un),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const un=[new B,new B,new B,new B,new B,new B,new B,new B],Ht=new B,Ji=new Vi,ti=new B,ni=new B,ii=new B,yn=new B,Tn=new B,In=new B,Ti=new B,Qi=new B,er=new B,Un=new B;function ua(i,e,t,n,r){for(let a=0,s=i.length-3;a<=s;a+=3){Un.fromArray(i,a);const o=r.x*Math.abs(Un.x)+r.y*Math.abs(Un.y)+r.z*Math.abs(Un.z),c=e.dot(Un),l=t.dot(Un),f=n.dot(Un);if(Math.max(-Math.max(c,l,f),Math.min(c,l,f))>o)return!1}return!0}const ht=new B,tr=new Ye;let Cu=0;class en{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Cu++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=Eo,this.updateRanges=[],this.gpuType=Zt,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let r=0,a=this.itemSize;r<a;r++)this.array[e+r]=t.array[n+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)tr.fromBufferAttribute(this,t),tr.applyMatrix3(e),this.setXY(t,tr.x,tr.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)ht.fromBufferAttribute(this,t),ht.applyMatrix3(e),this.setXYZ(t,ht.x,ht.y,ht.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)ht.fromBufferAttribute(this,t),ht.applyMatrix4(e),this.setXYZ(t,ht.x,ht.y,ht.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)ht.fromBufferAttribute(this,t),ht.applyNormalMatrix(e),this.setXYZ(t,ht.x,ht.y,ht.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)ht.fromBufferAttribute(this,t),ht.transformDirection(e),this.setXYZ(t,ht.x,ht.y,ht.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Ei(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Ct(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Ei(t,this.array)),t}setX(e,t){return this.normalized&&(t=Ct(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Ei(t,this.array)),t}setY(e,t){return this.normalized&&(t=Ct(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Ei(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Ct(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Ei(t,this.array)),t}setW(e,t){return this.normalized&&(t=Ct(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=Ct(t,this.array),n=Ct(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,r){return e*=this.itemSize,this.normalized&&(t=Ct(t,this.array),n=Ct(n,this.array),r=Ct(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this}setXYZW(e,t,n,r,a){return e*=this.itemSize,this.normalized&&(t=Ct(t,this.array),n=Ct(n,this.array),r=Ct(r,this.array),a=Ct(a,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this.array[e+3]=a,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Eo&&(e.usage=this.usage),e}}class Ql extends en{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class ec extends en{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class Ut extends en{constructor(e,t,n){super(new Float32Array(e),t,n)}}const Pu=new Vi,bi=new B,da=new B;class Br{constructor(e=new B,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):Pu.setFromPoints(e).getCenter(n);let r=0;for(let a=0,s=e.length;a<s;a++)r=Math.max(r,n.distanceToSquared(e[a]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;bi.subVectors(e,this.center);const t=bi.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),r=(n-this.radius)*.5;this.center.addScaledVector(bi,r/n),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(da.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(bi.copy(e.center).add(da)),this.expandByPoint(bi.copy(e.center).sub(da))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let Lu=0;const Nt=new at,ha=new St,ri=new B,Dt=new Vi,Ai=new Vi,vt=new B;class zt extends vi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Lu++}),this.uuid=Gi(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(uu(e)?ec:Ql)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const a=new Ue().getNormalMatrix(e);n.applyNormalMatrix(a),n.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return Nt.makeRotationFromQuaternion(e),this.applyMatrix4(Nt),this}rotateX(e){return Nt.makeRotationX(e),this.applyMatrix4(Nt),this}rotateY(e){return Nt.makeRotationY(e),this.applyMatrix4(Nt),this}rotateZ(e){return Nt.makeRotationZ(e),this.applyMatrix4(Nt),this}translate(e,t,n){return Nt.makeTranslation(e,t,n),this.applyMatrix4(Nt),this}scale(e,t,n){return Nt.makeScale(e,t,n),this.applyMatrix4(Nt),this}lookAt(e){return ha.lookAt(e),ha.updateMatrix(),this.applyMatrix4(ha.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(ri).negate(),this.translate(ri.x,ri.y,ri.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let r=0,a=e.length;r<a;r++){const s=e[r];n.push(s.x,s.y,s.z||0)}this.setAttribute("position",new Ut(n,3))}else{const n=Math.min(e.length,t.count);for(let r=0;r<n;r++){const a=e[r];t.setXYZ(r,a.x,a.y,a.z||0)}e.length>t.count&&Le("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Vi);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){We("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new B(-1/0,-1/0,-1/0),new B(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,r=t.length;n<r;n++){const a=t[n];Dt.setFromBufferAttribute(a),this.morphTargetsRelative?(vt.addVectors(this.boundingBox.min,Dt.min),this.boundingBox.expandByPoint(vt),vt.addVectors(this.boundingBox.max,Dt.max),this.boundingBox.expandByPoint(vt)):(this.boundingBox.expandByPoint(Dt.min),this.boundingBox.expandByPoint(Dt.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&We('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Br);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){We("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new B,1/0);return}if(e){const n=this.boundingSphere.center;if(Dt.setFromBufferAttribute(e),t)for(let a=0,s=t.length;a<s;a++){const o=t[a];Ai.setFromBufferAttribute(o),this.morphTargetsRelative?(vt.addVectors(Dt.min,Ai.min),Dt.expandByPoint(vt),vt.addVectors(Dt.max,Ai.max),Dt.expandByPoint(vt)):(Dt.expandByPoint(Ai.min),Dt.expandByPoint(Ai.max))}Dt.getCenter(n);let r=0;for(let a=0,s=e.count;a<s;a++)vt.fromBufferAttribute(e,a),r=Math.max(r,n.distanceToSquared(vt));if(t)for(let a=0,s=t.length;a<s;a++){const o=t[a],c=this.morphTargetsRelative;for(let l=0,f=o.count;l<f;l++)vt.fromBufferAttribute(o,l),c&&(ri.fromBufferAttribute(e,l),vt.add(ri)),r=Math.max(r,n.distanceToSquared(vt))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&We('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){We("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,r=t.normal,a=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new en(new Float32Array(4*n.count),4));const s=this.getAttribute("tangent"),o=[],c=[];for(let v=0;v<n.count;v++)o[v]=new B,c[v]=new B;const l=new B,f=new B,d=new B,h=new Ye,p=new Ye,g=new Ye,S=new B,m=new B;function u(v,E,O){l.fromBufferAttribute(n,v),f.fromBufferAttribute(n,E),d.fromBufferAttribute(n,O),h.fromBufferAttribute(a,v),p.fromBufferAttribute(a,E),g.fromBufferAttribute(a,O),f.sub(l),d.sub(l),p.sub(h),g.sub(h);const w=1/(p.x*g.y-g.x*p.y);isFinite(w)&&(S.copy(f).multiplyScalar(g.y).addScaledVector(d,-p.y).multiplyScalar(w),m.copy(d).multiplyScalar(p.x).addScaledVector(f,-g.x).multiplyScalar(w),o[v].add(S),o[E].add(S),o[O].add(S),c[v].add(m),c[E].add(m),c[O].add(m))}let M=this.groups;M.length===0&&(M=[{start:0,count:e.count}]);for(let v=0,E=M.length;v<E;++v){const O=M[v],w=O.start,k=O.count;for(let z=w,Y=w+k;z<Y;z+=3)u(e.getX(z+0),e.getX(z+1),e.getX(z+2))}const b=new B,T=new B,P=new B,R=new B;function L(v){P.fromBufferAttribute(r,v),R.copy(P);const E=o[v];b.copy(E),b.sub(P.multiplyScalar(P.dot(E))).normalize(),T.crossVectors(R,E);const w=T.dot(c[v])<0?-1:1;s.setXYZW(v,b.x,b.y,b.z,w)}for(let v=0,E=M.length;v<E;++v){const O=M[v],w=O.start,k=O.count;for(let z=w,Y=w+k;z<Y;z+=3)L(e.getX(z+0)),L(e.getX(z+1)),L(e.getX(z+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new en(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let h=0,p=n.count;h<p;h++)n.setXYZ(h,0,0,0);const r=new B,a=new B,s=new B,o=new B,c=new B,l=new B,f=new B,d=new B;if(e)for(let h=0,p=e.count;h<p;h+=3){const g=e.getX(h+0),S=e.getX(h+1),m=e.getX(h+2);r.fromBufferAttribute(t,g),a.fromBufferAttribute(t,S),s.fromBufferAttribute(t,m),f.subVectors(s,a),d.subVectors(r,a),f.cross(d),o.fromBufferAttribute(n,g),c.fromBufferAttribute(n,S),l.fromBufferAttribute(n,m),o.add(f),c.add(f),l.add(f),n.setXYZ(g,o.x,o.y,o.z),n.setXYZ(S,c.x,c.y,c.z),n.setXYZ(m,l.x,l.y,l.z)}else for(let h=0,p=t.count;h<p;h+=3)r.fromBufferAttribute(t,h+0),a.fromBufferAttribute(t,h+1),s.fromBufferAttribute(t,h+2),f.subVectors(s,a),d.subVectors(r,a),f.cross(d),n.setXYZ(h+0,f.x,f.y,f.z),n.setXYZ(h+1,f.x,f.y,f.z),n.setXYZ(h+2,f.x,f.y,f.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)vt.fromBufferAttribute(e,t),vt.normalize(),e.setXYZ(t,vt.x,vt.y,vt.z)}toNonIndexed(){function e(o,c){const l=o.array,f=o.itemSize,d=o.normalized,h=new l.constructor(c.length*f);let p=0,g=0;for(let S=0,m=c.length;S<m;S++){o.isInterleavedBufferAttribute?p=c[S]*o.data.stride+o.offset:p=c[S]*f;for(let u=0;u<f;u++)h[g++]=l[p++]}return new en(h,f,d)}if(this.index===null)return Le("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new zt,n=this.index.array,r=this.attributes;for(const o in r){const c=r[o],l=e(c,n);t.setAttribute(o,l)}const a=this.morphAttributes;for(const o in a){const c=[],l=a[o];for(let f=0,d=l.length;f<d;f++){const h=l[f],p=e(h,n);c.push(p)}t.morphAttributes[o]=c}t.morphTargetsRelative=this.morphTargetsRelative;const s=this.groups;for(let o=0,c=s.length;o<c;o++){const l=s[o];t.addGroup(l.start,l.count,l.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const c=this.parameters;for(const l in c)c[l]!==void 0&&(e[l]=c[l]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const c in n){const l=n[c];e.data.attributes[c]=l.toJSON(e.data)}const r={};let a=!1;for(const c in this.morphAttributes){const l=this.morphAttributes[c],f=[];for(let d=0,h=l.length;d<h;d++){const p=l[d];f.push(p.toJSON(e.data))}f.length>0&&(r[c]=f,a=!0)}a&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);const s=this.groups;s.length>0&&(e.data.groups=JSON.parse(JSON.stringify(s)));const o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone());const r=e.attributes;for(const l in r){const f=r[l];this.setAttribute(l,f.clone(t))}const a=e.morphAttributes;for(const l in a){const f=[],d=a[l];for(let h=0,p=d.length;h<p;h++)f.push(d[h].clone(t));this.morphAttributes[l]=f}this.morphTargetsRelative=e.morphTargetsRelative;const s=e.groups;for(let l=0,f=s.length;l<f;l++){const d=s[l];this.addGroup(d.start,d.count,d.materialIndex)}const o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());const c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}let Du=0;class Mi extends vi{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Du++}),this.uuid=Gi(),this.name="",this.type="Material",this.blending=ui,this.side=Pn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=La,this.blendDst=Da,this.blendEquation=Gn,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ge(0,0,0),this.blendAlpha=0,this.depthFunc=fi,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=So,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=$n,this.stencilZFail=$n,this.stencilZPass=$n,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){Le(`Material: parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){Le(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(n):r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==ui&&(n.blending=this.blending),this.side!==Pn&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==La&&(n.blendSrc=this.blendSrc),this.blendDst!==Da&&(n.blendDst=this.blendDst),this.blendEquation!==Gn&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==fi&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==So&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==$n&&(n.stencilFail=this.stencilFail),this.stencilZFail!==$n&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==$n&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.allowOverride===!1&&(n.allowOverride=!1),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(a){const s=[];for(const o in a){const c=a[o];delete c.metadata,s.push(c)}return s}if(t){const a=r(e.textures),s=r(e.images);a.length>0&&(n.textures=a),s.length>0&&(n.images=s)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const r=t.length;n=new Array(r);for(let a=0;a!==r;++a)n[a]=t[a].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}const dn=new B,fa=new B,nr=new B,bn=new B,pa=new B,ir=new B,ma=new B;class Xs{constructor(e=new B,t=new B(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,dn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=dn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(dn.copy(this.origin).addScaledVector(this.direction,t),dn.distanceToSquared(e))}distanceSqToSegment(e,t,n,r){fa.copy(e).add(t).multiplyScalar(.5),nr.copy(t).sub(e).normalize(),bn.copy(this.origin).sub(fa);const a=e.distanceTo(t)*.5,s=-this.direction.dot(nr),o=bn.dot(this.direction),c=-bn.dot(nr),l=bn.lengthSq(),f=Math.abs(1-s*s);let d,h,p,g;if(f>0)if(d=s*c-o,h=s*o-c,g=a*f,d>=0)if(h>=-g)if(h<=g){const S=1/f;d*=S,h*=S,p=d*(d+s*h+2*o)+h*(s*d+h+2*c)+l}else h=a,d=Math.max(0,-(s*h+o)),p=-d*d+h*(h+2*c)+l;else h=-a,d=Math.max(0,-(s*h+o)),p=-d*d+h*(h+2*c)+l;else h<=-g?(d=Math.max(0,-(-s*a+o)),h=d>0?-a:Math.min(Math.max(-a,-c),a),p=-d*d+h*(h+2*c)+l):h<=g?(d=0,h=Math.min(Math.max(-a,-c),a),p=h*(h+2*c)+l):(d=Math.max(0,-(s*a+o)),h=d>0?a:Math.min(Math.max(-a,-c),a),p=-d*d+h*(h+2*c)+l);else h=s>0?-a:a,d=Math.max(0,-(s*h+o)),p=-d*d+h*(h+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,d),r&&r.copy(fa).addScaledVector(nr,h),p}intersectSphere(e,t){dn.subVectors(e.center,this.origin);const n=dn.dot(this.direction),r=dn.dot(dn)-n*n,a=e.radius*e.radius;if(r>a)return null;const s=Math.sqrt(a-r),o=n-s,c=n+s;return c<0?null:o<0?this.at(c,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,r,a,s,o,c;const l=1/this.direction.x,f=1/this.direction.y,d=1/this.direction.z,h=this.origin;return l>=0?(n=(e.min.x-h.x)*l,r=(e.max.x-h.x)*l):(n=(e.max.x-h.x)*l,r=(e.min.x-h.x)*l),f>=0?(a=(e.min.y-h.y)*f,s=(e.max.y-h.y)*f):(a=(e.max.y-h.y)*f,s=(e.min.y-h.y)*f),n>s||a>r||((a>n||isNaN(n))&&(n=a),(s<r||isNaN(r))&&(r=s),d>=0?(o=(e.min.z-h.z)*d,c=(e.max.z-h.z)*d):(o=(e.max.z-h.z)*d,c=(e.min.z-h.z)*d),n>c||o>r)||((o>n||n!==n)&&(n=o),(c<r||r!==r)&&(r=c),r<0)?null:this.at(n>=0?n:r,t)}intersectsBox(e){return this.intersectBox(e,dn)!==null}intersectTriangle(e,t,n,r,a){pa.subVectors(t,e),ir.subVectors(n,e),ma.crossVectors(pa,ir);let s=this.direction.dot(ma),o;if(s>0){if(r)return null;o=1}else if(s<0)o=-1,s=-s;else return null;bn.subVectors(this.origin,e);const c=o*this.direction.dot(ir.crossVectors(bn,ir));if(c<0)return null;const l=o*this.direction.dot(pa.cross(bn));if(l<0||c+l>s)return null;const f=-o*bn.dot(ma);return f<0?null:this.at(f/s,a)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Ir extends Mi{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ge(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new nn,this.combine=Us,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Oo=new at,Nn=new Xs,rr=new Br,Bo=new B,ar=new B,sr=new B,or=new B,_a=new B,lr=new B,zo=new B,cr=new B;class Bt extends St{constructor(e=new zt,t=new Ir){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const r=t[n[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let a=0,s=r.length;a<s;a++){const o=r[a].name||String(a);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=a}}}}getVertexPosition(e,t){const n=this.geometry,r=n.attributes.position,a=n.morphAttributes.position,s=n.morphTargetsRelative;t.fromBufferAttribute(r,e);const o=this.morphTargetInfluences;if(a&&o){lr.set(0,0,0);for(let c=0,l=a.length;c<l;c++){const f=o[c],d=a[c];f!==0&&(_a.fromBufferAttribute(d,e),s?lr.addScaledVector(_a,f):lr.addScaledVector(_a.sub(t),f))}t.add(lr)}return t}raycast(e,t){const n=this.geometry,r=this.material,a=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),rr.copy(n.boundingSphere),rr.applyMatrix4(a),Nn.copy(e.ray).recast(e.near),!(rr.containsPoint(Nn.origin)===!1&&(Nn.intersectSphere(rr,Bo)===null||Nn.origin.distanceToSquared(Bo)>(e.far-e.near)**2))&&(Oo.copy(a).invert(),Nn.copy(e.ray).applyMatrix4(Oo),!(n.boundingBox!==null&&Nn.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Nn)))}_computeIntersections(e,t,n){let r;const a=this.geometry,s=this.material,o=a.index,c=a.attributes.position,l=a.attributes.uv,f=a.attributes.uv1,d=a.attributes.normal,h=a.groups,p=a.drawRange;if(o!==null)if(Array.isArray(s))for(let g=0,S=h.length;g<S;g++){const m=h[g],u=s[m.materialIndex],M=Math.max(m.start,p.start),b=Math.min(o.count,Math.min(m.start+m.count,p.start+p.count));for(let T=M,P=b;T<P;T+=3){const R=o.getX(T),L=o.getX(T+1),v=o.getX(T+2);r=ur(this,u,e,n,l,f,d,R,L,v),r&&(r.faceIndex=Math.floor(T/3),r.face.materialIndex=m.materialIndex,t.push(r))}}else{const g=Math.max(0,p.start),S=Math.min(o.count,p.start+p.count);for(let m=g,u=S;m<u;m+=3){const M=o.getX(m),b=o.getX(m+1),T=o.getX(m+2);r=ur(this,s,e,n,l,f,d,M,b,T),r&&(r.faceIndex=Math.floor(m/3),t.push(r))}}else if(c!==void 0)if(Array.isArray(s))for(let g=0,S=h.length;g<S;g++){const m=h[g],u=s[m.materialIndex],M=Math.max(m.start,p.start),b=Math.min(c.count,Math.min(m.start+m.count,p.start+p.count));for(let T=M,P=b;T<P;T+=3){const R=T,L=T+1,v=T+2;r=ur(this,u,e,n,l,f,d,R,L,v),r&&(r.faceIndex=Math.floor(T/3),r.face.materialIndex=m.materialIndex,t.push(r))}}else{const g=Math.max(0,p.start),S=Math.min(c.count,p.start+p.count);for(let m=g,u=S;m<u;m+=3){const M=m,b=m+1,T=m+2;r=ur(this,s,e,n,l,f,d,M,b,T),r&&(r.faceIndex=Math.floor(m/3),t.push(r))}}}}function Iu(i,e,t,n,r,a,s,o){let c;if(e.side===wt?c=n.intersectTriangle(s,a,r,!0,o):c=n.intersectTriangle(r,a,s,e.side===Pn,o),c===null)return null;cr.copy(o),cr.applyMatrix4(i.matrixWorld);const l=t.ray.origin.distanceTo(cr);return l<t.near||l>t.far?null:{distance:l,point:cr.clone(),object:i}}function ur(i,e,t,n,r,a,s,o,c,l){i.getVertexPosition(o,ar),i.getVertexPosition(c,sr),i.getVertexPosition(l,or);const f=Iu(i,e,t,n,ar,sr,or,zo);if(f){const d=new B;Wt.getBarycoord(zo,ar,sr,or,d),r&&(f.uv=Wt.getInterpolatedAttribute(r,o,c,l,d,new Ye)),a&&(f.uv1=Wt.getInterpolatedAttribute(a,o,c,l,d,new Ye)),s&&(f.normal=Wt.getInterpolatedAttribute(s,o,c,l,d,new B),f.normal.dot(n.direction)>0&&f.normal.multiplyScalar(-1));const h={a:o,b:c,c:l,normal:new B,materialIndex:0};Wt.getNormal(ar,sr,or,h.normal),f.face=h,f.barycoord=d}return f}class Uu extends At{constructor(e=null,t=1,n=1,r,a,s,o,c,l=Mt,f=Mt,d,h){super(null,s,o,c,l,f,r,a,d,h),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const ga=new B,Nu=new B,Fu=new Ue;class zn{constructor(e=new B(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,r){return this.normal.set(e,t,n),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const r=ga.subVectors(n,t).cross(Nu.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const n=e.delta(ga),r=this.normal.dot(n);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const a=-(e.start.dot(this.normal)+this.constant)/r;return a<0||a>1?null:t.copy(e.start).addScaledVector(n,a)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||Fu.getNormalMatrix(e),r=this.coplanarPoint(ga).applyMatrix4(e),a=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(a),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Fn=new Br,Ou=new Ye(.5,.5),dr=new B;class qs{constructor(e=new zn,t=new zn,n=new zn,r=new zn,a=new zn,s=new zn){this.planes=[e,t,n,r,a,s]}set(e,t,n,r,a,s){const o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(r),o[4].copy(a),o[5].copy(s),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=jt,n=!1){const r=this.planes,a=e.elements,s=a[0],o=a[1],c=a[2],l=a[3],f=a[4],d=a[5],h=a[6],p=a[7],g=a[8],S=a[9],m=a[10],u=a[11],M=a[12],b=a[13],T=a[14],P=a[15];if(r[0].setComponents(l-s,p-f,u-g,P-M).normalize(),r[1].setComponents(l+s,p+f,u+g,P+M).normalize(),r[2].setComponents(l+o,p+d,u+S,P+b).normalize(),r[3].setComponents(l-o,p-d,u-S,P-b).normalize(),n)r[4].setComponents(c,h,m,T).normalize(),r[5].setComponents(l-c,p-h,u-m,P-T).normalize();else if(r[4].setComponents(l-c,p-h,u-m,P-T).normalize(),t===jt)r[5].setComponents(l+c,p+h,u+m,P+T).normalize();else if(t===Oi)r[5].setComponents(c,h,m,T).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Fn.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Fn.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Fn)}intersectsSprite(e){Fn.center.set(0,0,0);const t=Ou.distanceTo(e.center);return Fn.radius=.7071067811865476+t,Fn.applyMatrix4(e.matrixWorld),this.intersectsSphere(Fn)}intersectsSphere(e){const t=this.planes,n=e.center,r=-e.radius;for(let a=0;a<6;a++)if(t[a].distanceToPoint(n)<r)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const r=t[n];if(dr.x=r.normal.x>0?e.max.x:e.min.x,dr.y=r.normal.y>0?e.max.y:e.min.y,dr.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(dr)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class tc extends Mi{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Ge(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const Go=new at,Ss=new Xs,hr=new Br,fr=new B;class Bu extends St{constructor(e=new zt,t=new tc){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const n=this.geometry,r=this.matrixWorld,a=e.params.Points.threshold,s=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),hr.copy(n.boundingSphere),hr.applyMatrix4(r),hr.radius+=a,e.ray.intersectsSphere(hr)===!1)return;Go.copy(r).invert(),Ss.copy(e.ray).applyMatrix4(Go);const o=a/((this.scale.x+this.scale.y+this.scale.z)/3),c=o*o,l=n.index,d=n.attributes.position;if(l!==null){const h=Math.max(0,s.start),p=Math.min(l.count,s.start+s.count);for(let g=h,S=p;g<S;g++){const m=l.getX(g);fr.fromBufferAttribute(d,m),Vo(fr,m,c,r,e,t,this)}}else{const h=Math.max(0,s.start),p=Math.min(d.count,s.start+s.count);for(let g=h,S=p;g<S;g++)fr.fromBufferAttribute(d,g),Vo(fr,g,c,r,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const r=t[n[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let a=0,s=r.length;a<s;a++){const o=r[a].name||String(a);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=a}}}}}function Vo(i,e,t,n,r,a,s){const o=Ss.distanceSqToPoint(i);if(o<t){const c=new B;Ss.closestPointToPoint(i,c),c.applyMatrix4(n);const l=r.ray.origin.distanceTo(c);if(l<r.near||l>r.far)return;a.push({distance:l,distanceToRay:Math.sqrt(o),point:c,index:e,face:null,faceIndex:null,barycoord:null,object:s})}}class nc extends At{constructor(e=[],t=Xn,n,r,a,s,o,c,l,f){super(e,t,n,r,a,s,o,c,l,f),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class zi extends At{constructor(e,t,n=tn,r,a,s,o=Mt,c=Mt,l,f=vn,d=1){if(f!==vn&&f!==Wn)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const h={width:e,height:t,depth:d};super(h,r,a,s,o,c,f,n,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Hs(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class zu extends zi{constructor(e,t=tn,n=Xn,r,a,s=Mt,o=Mt,c,l=vn){const f={width:e,height:e,depth:1},d=[f,f,f,f,f,f];super(e,e,t,n,r,a,s,o,c,l),this.image=d,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class ic extends At{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class ki extends zt{constructor(e=1,t=1,n=1,r=1,a=1,s=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:r,heightSegments:a,depthSegments:s};const o=this;r=Math.floor(r),a=Math.floor(a),s=Math.floor(s);const c=[],l=[],f=[],d=[];let h=0,p=0;g("z","y","x",-1,-1,n,t,e,s,a,0),g("z","y","x",1,-1,n,t,-e,s,a,1),g("x","z","y",1,1,e,n,t,r,s,2),g("x","z","y",1,-1,e,n,-t,r,s,3),g("x","y","z",1,-1,e,t,n,r,a,4),g("x","y","z",-1,-1,e,t,-n,r,a,5),this.setIndex(c),this.setAttribute("position",new Ut(l,3)),this.setAttribute("normal",new Ut(f,3)),this.setAttribute("uv",new Ut(d,2));function g(S,m,u,M,b,T,P,R,L,v,E){const O=T/L,w=P/v,k=T/2,z=P/2,Y=R/2,V=L+1,H=v+1;let N=0,te=0;const j=new B;for(let he=0;he<H;he++){const J=he*w-z;for(let ie=0;ie<V;ie++){const Ae=ie*O-k;j[S]=Ae*M,j[m]=J*b,j[u]=Y,l.push(j.x,j.y,j.z),j[S]=0,j[m]=0,j[u]=R>0?1:-1,f.push(j.x,j.y,j.z),d.push(ie/L),d.push(1-he/v),N+=1}}for(let he=0;he<v;he++)for(let J=0;J<L;J++){const ie=h+J+V*he,Ae=h+J+V*(he+1),ke=h+(J+1)+V*(he+1),Ve=h+(J+1)+V*he;c.push(ie,Ae,Ve),c.push(Ae,ke,Ve),te+=6}o.addGroup(p,te,E),p+=te,h+=N}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ki(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}class zr extends zt{constructor(e=1,t=1,n=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:r};const a=e/2,s=t/2,o=Math.floor(n),c=Math.floor(r),l=o+1,f=c+1,d=e/o,h=t/c,p=[],g=[],S=[],m=[];for(let u=0;u<f;u++){const M=u*h-s;for(let b=0;b<l;b++){const T=b*d-a;g.push(T,-M,0),S.push(0,0,1),m.push(b/o),m.push(1-u/c)}}for(let u=0;u<c;u++)for(let M=0;M<o;M++){const b=M+l*u,T=M+l*(u+1),P=M+1+l*(u+1),R=M+1+l*u;p.push(b,T,R),p.push(T,P,R)}this.setIndex(p),this.setAttribute("position",new Ut(g,3)),this.setAttribute("normal",new Ut(S,3)),this.setAttribute("uv",new Ut(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new zr(e.width,e.height,e.widthSegments,e.heightSegments)}}class Li extends zt{constructor(e=1,t=32,n=16,r=0,a=Math.PI*2,s=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:r,phiLength:a,thetaStart:s,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const c=Math.min(s+o,Math.PI);let l=0;const f=[],d=new B,h=new B,p=[],g=[],S=[],m=[];for(let u=0;u<=n;u++){const M=[],b=u/n;let T=0;u===0&&s===0?T=.5/t:u===n&&c===Math.PI&&(T=-.5/t);for(let P=0;P<=t;P++){const R=P/t;d.x=-e*Math.cos(r+R*a)*Math.sin(s+b*o),d.y=e*Math.cos(s+b*o),d.z=e*Math.sin(r+R*a)*Math.sin(s+b*o),g.push(d.x,d.y,d.z),h.copy(d).normalize(),S.push(h.x,h.y,h.z),m.push(R+T,1-b),M.push(l++)}f.push(M)}for(let u=0;u<n;u++)for(let M=0;M<t;M++){const b=f[u][M+1],T=f[u][M],P=f[u+1][M],R=f[u+1][M+1];(u!==0||s>0)&&p.push(b,T,R),(u!==n-1||c<Math.PI)&&p.push(T,P,R)}this.setIndex(p),this.setAttribute("position",new Ut(g,3)),this.setAttribute("normal",new Ut(S,3)),this.setAttribute("uv",new Ut(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Li(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}function gi(i){const e={};for(const t in i){e[t]={};for(const n in i[t]){const r=i[t][n];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(Le("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=r.clone():Array.isArray(r)?e[t][n]=r.slice():e[t][n]=r}}return e}function Rt(i){const e={};for(let t=0;t<i.length;t++){const n=gi(i[t]);for(const r in n)e[r]=n[r]}return e}function Gu(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function rc(i){const e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:Xe.workingColorSpace}const Vu={clone:gi,merge:Rt};var ku=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Hu=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class rn extends Mi{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=ku,this.fragmentShader=Hu,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=gi(e.uniforms),this.uniformsGroups=Gu(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const r in this.uniforms){const s=this.uniforms[r].value;s&&s.isTexture?t.uniforms[r]={type:"t",value:s.toJSON(e).uuid}:s&&s.isColor?t.uniforms[r]={type:"c",value:s.getHex()}:s&&s.isVector2?t.uniforms[r]={type:"v2",value:s.toArray()}:s&&s.isVector3?t.uniforms[r]={type:"v3",value:s.toArray()}:s&&s.isVector4?t.uniforms[r]={type:"v4",value:s.toArray()}:s&&s.isMatrix3?t.uniforms[r]={type:"m3",value:s.toArray()}:s&&s.isMatrix4?t.uniforms[r]={type:"m4",value:s.toArray()}:t.uniforms[r]={value:s}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const r in this.extensions)this.extensions[r]===!0&&(n[r]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}}class Wu extends rn{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class Xu extends Mi{constructor(e){super(),this.isMeshPhongMaterial=!0,this.type="MeshPhongMaterial",this.color=new Ge(16777215),this.specular=new Ge(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ge(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Kl,this.normalScale=new Ye(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new nn,this.combine=Us,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.specular.copy(e.specular),this.shininess=e.shininess,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.envMapIntensity=e.envMapIntensity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class qu extends Mi{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=nu,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class Yu extends Mi{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const va={enabled:!1,files:{},add:function(i,e){this.enabled!==!1&&(ko(i)||(this.files[i]=e))},get:function(i){if(this.enabled!==!1&&!ko(i))return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}};function ko(i){try{const e=i.slice(i.indexOf(":")+1);return new URL(e).protocol==="blob:"}catch{return!1}}class $u{constructor(e,t,n){const r=this;let a=!1,s=0,o=0,c;const l=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(f){o++,a===!1&&r.onStart!==void 0&&r.onStart(f,s,o),a=!0},this.itemEnd=function(f){s++,r.onProgress!==void 0&&r.onProgress(f,s,o),s===o&&(a=!1,r.onLoad!==void 0&&r.onLoad())},this.itemError=function(f){r.onError!==void 0&&r.onError(f)},this.resolveURL=function(f){return c?c(f):f},this.setURLModifier=function(f){return c=f,this},this.addHandler=function(f,d){return l.push(f,d),this},this.removeHandler=function(f){const d=l.indexOf(f);return d!==-1&&l.splice(d,2),this},this.getHandler=function(f){for(let d=0,h=l.length;d<h;d+=2){const p=l[d],g=l[d+1];if(p.global&&(p.lastIndex=0),p.test(f))return g}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const Ku=new $u;class Ys{constructor(e){this.manager=e!==void 0?e:Ku,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){const n=this;return new Promise(function(r,a){n.load(e,r,t,a)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}Ys.DEFAULT_MATERIAL_NAME="__DEFAULT";const ai=new WeakMap;class Zu extends Ys{constructor(e){super(e)}load(e,t,n,r){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const a=this,s=va.get(`image:${e}`);if(s!==void 0){if(s.complete===!0)a.manager.itemStart(e),setTimeout(function(){t&&t(s),a.manager.itemEnd(e)},0);else{let d=ai.get(s);d===void 0&&(d=[],ai.set(s,d)),d.push({onLoad:t,onError:r})}return s}const o=Bi("img");function c(){f(),t&&t(this);const d=ai.get(this)||[];for(let h=0;h<d.length;h++){const p=d[h];p.onLoad&&p.onLoad(this)}ai.delete(this),a.manager.itemEnd(e)}function l(d){f(),r&&r(d),va.remove(`image:${e}`);const h=ai.get(this)||[];for(let p=0;p<h.length;p++){const g=h[p];g.onError&&g.onError(d)}ai.delete(this),a.manager.itemError(e),a.manager.itemEnd(e)}function f(){o.removeEventListener("load",c,!1),o.removeEventListener("error",l,!1)}return o.addEventListener("load",c,!1),o.addEventListener("error",l,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),va.add(`image:${e}`,o),a.manager.itemStart(e),o.src=e,o}}class ju extends Ys{constructor(e){super(e)}load(e,t,n,r){const a=new At,s=new Zu(this.manager);return s.setCrossOrigin(this.crossOrigin),s.setPath(this.path),s.load(e,function(o){a.image=o,a.needsUpdate=!0,t!==void 0&&t(a)},n,r),a}}class ac extends St{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Ge(e),this.intensity=t}dispose(){this.dispatchEvent({type:"dispose"})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}}const xa=new at,Ho=new B,Wo=new B;class Ju{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Ye(512,512),this.mapType=It,this.map=null,this.mapPass=null,this.matrix=new at,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new qs,this._frameExtents=new Ye(1,1),this._viewportCount=1,this._viewports=[new ot(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,n=this.matrix;Ho.setFromMatrixPosition(e.matrixWorld),t.position.copy(Ho),Wo.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Wo),t.updateMatrixWorld(),xa.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(xa,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===Oi||t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(xa)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const pr=new B,mr=new xi,Yt=new B;class sc extends St{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new at,this.projectionMatrix=new at,this.projectionMatrixInverse=new at,this.coordinateSystem=jt,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(pr,mr,Yt),Yt.x===1&&Yt.y===1&&Yt.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(pr,mr,Yt.set(1,1,1)).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorld.decompose(pr,mr,Yt),Yt.x===1&&Yt.y===1&&Yt.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(pr,mr,Yt.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const An=new B,Xo=new Ye,qo=new Ye;class Ot extends sc{constructor(e=50,t=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Ms*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan($r*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Ms*2*Math.atan(Math.tan($r*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){An.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(An.x,An.y).multiplyScalar(-e/An.z),An.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(An.x,An.y).multiplyScalar(-e/An.z)}getViewSize(e,t){return this.getViewBounds(e,Xo,qo),t.subVectors(qo,Xo)}setViewOffset(e,t,n,r,a,s){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=a,this.view.height=s,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan($r*.5*this.fov)/this.zoom,n=2*t,r=this.aspect*n,a=-.5*r;const s=this.view;if(this.view!==null&&this.view.enabled){const c=s.fullWidth,l=s.fullHeight;a+=s.offsetX*r/c,t-=s.offsetY*n/l,r*=s.width/c,n*=s.height/l}const o=this.filmOffset;o!==0&&(a+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(a,a+r,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class $s extends sc{constructor(e=-1,t=1,n=1,r=-1,a=.1,s=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=r,this.near=a,this.far=s,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,r,a,s){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=a,this.view.height=s,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let a=n-e,s=n+e,o=r+t,c=r-t;if(this.view!==null&&this.view.enabled){const l=(this.right-this.left)/this.view.fullWidth/this.zoom,f=(this.top-this.bottom)/this.view.fullHeight/this.zoom;a+=l*this.view.offsetX,s=a+l*this.view.width,o-=f*this.view.offsetY,c=o-f*this.view.height}this.projectionMatrix.makeOrthographic(a,s,o,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class Qu extends Ju{constructor(){super(new $s(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class ed extends ac{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(St.DEFAULT_UP),this.updateMatrix(),this.target=new St,this.shadow=new Qu}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}}class td extends ac{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}const si=-90,oi=1;class nd extends St{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new Ot(si,oi,e,t);r.layers=this.layers,this.add(r);const a=new Ot(si,oi,e,t);a.layers=this.layers,this.add(a);const s=new Ot(si,oi,e,t);s.layers=this.layers,this.add(s);const o=new Ot(si,oi,e,t);o.layers=this.layers,this.add(o);const c=new Ot(si,oi,e,t);c.layers=this.layers,this.add(c);const l=new Ot(si,oi,e,t);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,r,a,s,o,c]=t;for(const l of t)this.remove(l);if(e===jt)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),a.up.set(0,0,-1),a.lookAt(0,1,0),s.up.set(0,0,1),s.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(e===Oi)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),a.up.set(0,0,1),a.lookAt(0,1,0),s.up.set(0,0,-1),s.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const l of t)this.add(l),l.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[a,s,o,c,l,f]=this.children,d=e.getRenderTarget(),h=e.getActiveCubeFace(),p=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;const S=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let m=!1;e.isWebGLRenderer===!0?m=e.state.buffers.depth.getReversed():m=e.reversedDepthBuffer,e.setRenderTarget(n,0,r),m&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,1,r),m&&e.autoClear===!1&&e.clearDepth(),e.render(t,s),e.setRenderTarget(n,2,r),m&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,3,r),m&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),e.setRenderTarget(n,4,r),m&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),n.texture.generateMipmaps=S,e.setRenderTarget(n,5,r),m&&e.autoClear===!1&&e.clearDepth(),e.render(t,f),e.setRenderTarget(d,h,p),e.xr.enabled=g,n.texture.needsPMREMUpdate=!0}}class id extends Ot{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}const Yo=new at;class rd{constructor(e,t,n=0,r=1/0){this.ray=new Xs(e,t),this.near=n,this.far=r,this.camera=null,this.layers=new Ws,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):We("Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return Yo.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Yo),this}intersectObject(e,t=!0,n=[]){return Es(e,this,n,t),n.sort($o),n}intersectObjects(e,t=!0,n=[]){for(let r=0,a=e.length;r<a;r++)Es(e[r],this,n,t);return n.sort($o),n}}function $o(i,e){return i.distance-e.distance}function Es(i,e,t,n){let r=!0;if(i.layers.test(e.layers)&&i.raycast(e,t)===!1&&(r=!1),r===!0&&n===!0){const a=i.children;for(let s=0,o=a.length;s<o;s++)Es(a[s],e,t,!0)}}function Ko(i,e,t,n){const r=ad(n);switch(t){case ql:return i*e;case $l:return i*e/r.components*r.byteLength;case Bs:return i*e/r.components*r.byteLength;case mi:return i*e*2/r.components*r.byteLength;case zs:return i*e*2/r.components*r.byteLength;case Yl:return i*e*3/r.components*r.byteLength;case Xt:return i*e*4/r.components*r.byteLength;case Gs:return i*e*4/r.components*r.byteLength;case Er:case yr:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Tr:case br:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Ha:case Xa:return Math.max(i,16)*Math.max(e,8)/4;case ka:case Wa:return Math.max(i,8)*Math.max(e,8)/2;case qa:case Ya:case Ka:case Za:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case $a:case ja:case Ja:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Qa:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case es:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case ts:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case ns:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case is:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case rs:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case as:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case ss:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case os:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case ls:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case cs:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case us:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case ds:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case hs:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case fs:case ps:case ms:return Math.ceil(i/4)*Math.ceil(e/4)*16;case _s:case gs:return Math.ceil(i/4)*Math.ceil(e/4)*8;case vs:case xs:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function ad(i){switch(i){case It:case kl:return{byteLength:1,components:1};case Ni:case Hl:case gn:return{byteLength:2,components:1};case Fs:case Os:return{byteLength:2,components:4};case tn:case Ns:case Zt:return{byteLength:4,components:1};case Wl:case Xl:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Is}}));typeof window<"u"&&(window.__THREE__?Le("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Is);/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function oc(){let i=null,e=!1,t=null,n=null;function r(a,s){t(a,s),n=i.requestAnimationFrame(r)}return{start:function(){e!==!0&&t!==null&&(n=i.requestAnimationFrame(r),e=!0)},stop:function(){i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(a){t=a},setContext:function(a){i=a}}}function sd(i){const e=new WeakMap;function t(o,c){const l=o.array,f=o.usage,d=l.byteLength,h=i.createBuffer();i.bindBuffer(c,h),i.bufferData(c,l,f),o.onUploadCallback();let p;if(l instanceof Float32Array)p=i.FLOAT;else if(typeof Float16Array<"u"&&l instanceof Float16Array)p=i.HALF_FLOAT;else if(l instanceof Uint16Array)o.isFloat16BufferAttribute?p=i.HALF_FLOAT:p=i.UNSIGNED_SHORT;else if(l instanceof Int16Array)p=i.SHORT;else if(l instanceof Uint32Array)p=i.UNSIGNED_INT;else if(l instanceof Int32Array)p=i.INT;else if(l instanceof Int8Array)p=i.BYTE;else if(l instanceof Uint8Array)p=i.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)p=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:h,type:p,bytesPerElement:l.BYTES_PER_ELEMENT,version:o.version,size:d}}function n(o,c,l){const f=c.array,d=c.updateRanges;if(i.bindBuffer(l,o),d.length===0)i.bufferSubData(l,0,f);else{d.sort((p,g)=>p.start-g.start);let h=0;for(let p=1;p<d.length;p++){const g=d[h],S=d[p];S.start<=g.start+g.count+1?g.count=Math.max(g.count,S.start+S.count-g.start):(++h,d[h]=S)}d.length=h+1;for(let p=0,g=d.length;p<g;p++){const S=d[p];i.bufferSubData(l,S.start*f.BYTES_PER_ELEMENT,f,S.start,S.count)}c.clearUpdateRanges()}c.onUploadCallback()}function r(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function a(o){o.isInterleavedBufferAttribute&&(o=o.data);const c=e.get(o);c&&(i.deleteBuffer(c.buffer),e.delete(o))}function s(o,c){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const f=e.get(o);(!f||f.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const l=e.get(o);if(l===void 0)e.set(o,t(o,c));else if(l.version<o.version){if(l.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(l.buffer,o,c),l.version=o.version}}return{get:r,remove:a,update:s}}var od=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,ld=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,cd=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,ud=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,dd=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,hd=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,fd=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,pd=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,md=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,_d=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,gd=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,vd=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,xd=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Md=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Sd=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Ed=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,yd=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Td=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,bd=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Ad=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,Rd=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,wd=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Cd=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,Pd=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Ld=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Dd=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Id=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Ud=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Nd=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Fd=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Od="gl_FragColor = linearToOutputTexel( gl_FragColor );",Bd=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,zd=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,Gd=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,Vd=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,kd=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Hd=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Wd=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Xd=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,qd=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Yd=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,$d=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Kd=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Zd=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,jd=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Jd=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,Qd=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,eh=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,th=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,nh=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,ih=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,rh=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,ah=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return v;
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,sh=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,oh=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,lh=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,ch=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,uh=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,dh=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,hh=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,fh=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,ph=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,mh=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,_h=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,gh=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,vh=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,xh=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Mh=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Sh=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Eh=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,yh=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Th=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,bh=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Ah=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Rh=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,wh=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Ch=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Ph=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Lh=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Dh=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Ih=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Uh=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Nh=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,Fh=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Oh=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Bh=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,zh=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Gh=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Vh=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,kh=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,Hh=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Wh=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Xh=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,qh=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Yh=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,$h=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Kh=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Zh=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,jh=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Jh=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Qh=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,ef=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,tf=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,nf=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,rf=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,af=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,sf=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const of=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,lf=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,uf=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,df=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,hf=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,ff=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,pf=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,mf=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,_f=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,gf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,vf=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,xf=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Mf=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Sf=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Ef=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,yf=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Tf=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,bf=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Af=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Rf=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,wf=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Cf=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Pf=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Lf=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Df=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,If=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Uf=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Nf=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Ff=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Of=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Bf=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,zf=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Gf=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Ne={alphahash_fragment:od,alphahash_pars_fragment:ld,alphamap_fragment:cd,alphamap_pars_fragment:ud,alphatest_fragment:dd,alphatest_pars_fragment:hd,aomap_fragment:fd,aomap_pars_fragment:pd,batching_pars_vertex:md,batching_vertex:_d,begin_vertex:gd,beginnormal_vertex:vd,bsdfs:xd,iridescence_fragment:Md,bumpmap_pars_fragment:Sd,clipping_planes_fragment:Ed,clipping_planes_pars_fragment:yd,clipping_planes_pars_vertex:Td,clipping_planes_vertex:bd,color_fragment:Ad,color_pars_fragment:Rd,color_pars_vertex:wd,color_vertex:Cd,common:Pd,cube_uv_reflection_fragment:Ld,defaultnormal_vertex:Dd,displacementmap_pars_vertex:Id,displacementmap_vertex:Ud,emissivemap_fragment:Nd,emissivemap_pars_fragment:Fd,colorspace_fragment:Od,colorspace_pars_fragment:Bd,envmap_fragment:zd,envmap_common_pars_fragment:Gd,envmap_pars_fragment:Vd,envmap_pars_vertex:kd,envmap_physical_pars_fragment:Qd,envmap_vertex:Hd,fog_vertex:Wd,fog_pars_vertex:Xd,fog_fragment:qd,fog_pars_fragment:Yd,gradientmap_pars_fragment:$d,lightmap_pars_fragment:Kd,lights_lambert_fragment:Zd,lights_lambert_pars_fragment:jd,lights_pars_begin:Jd,lights_toon_fragment:eh,lights_toon_pars_fragment:th,lights_phong_fragment:nh,lights_phong_pars_fragment:ih,lights_physical_fragment:rh,lights_physical_pars_fragment:ah,lights_fragment_begin:sh,lights_fragment_maps:oh,lights_fragment_end:lh,logdepthbuf_fragment:ch,logdepthbuf_pars_fragment:uh,logdepthbuf_pars_vertex:dh,logdepthbuf_vertex:hh,map_fragment:fh,map_pars_fragment:ph,map_particle_fragment:mh,map_particle_pars_fragment:_h,metalnessmap_fragment:gh,metalnessmap_pars_fragment:vh,morphinstance_vertex:xh,morphcolor_vertex:Mh,morphnormal_vertex:Sh,morphtarget_pars_vertex:Eh,morphtarget_vertex:yh,normal_fragment_begin:Th,normal_fragment_maps:bh,normal_pars_fragment:Ah,normal_pars_vertex:Rh,normal_vertex:wh,normalmap_pars_fragment:Ch,clearcoat_normal_fragment_begin:Ph,clearcoat_normal_fragment_maps:Lh,clearcoat_pars_fragment:Dh,iridescence_pars_fragment:Ih,opaque_fragment:Uh,packing:Nh,premultiplied_alpha_fragment:Fh,project_vertex:Oh,dithering_fragment:Bh,dithering_pars_fragment:zh,roughnessmap_fragment:Gh,roughnessmap_pars_fragment:Vh,shadowmap_pars_fragment:kh,shadowmap_pars_vertex:Hh,shadowmap_vertex:Wh,shadowmask_pars_fragment:Xh,skinbase_vertex:qh,skinning_pars_vertex:Yh,skinning_vertex:$h,skinnormal_vertex:Kh,specularmap_fragment:Zh,specularmap_pars_fragment:jh,tonemapping_fragment:Jh,tonemapping_pars_fragment:Qh,transmission_fragment:ef,transmission_pars_fragment:tf,uv_pars_fragment:nf,uv_pars_vertex:rf,uv_vertex:af,worldpos_vertex:sf,background_vert:of,background_frag:lf,backgroundCube_vert:cf,backgroundCube_frag:uf,cube_vert:df,cube_frag:hf,depth_vert:ff,depth_frag:pf,distance_vert:mf,distance_frag:_f,equirect_vert:gf,equirect_frag:vf,linedashed_vert:xf,linedashed_frag:Mf,meshbasic_vert:Sf,meshbasic_frag:Ef,meshlambert_vert:yf,meshlambert_frag:Tf,meshmatcap_vert:bf,meshmatcap_frag:Af,meshnormal_vert:Rf,meshnormal_frag:wf,meshphong_vert:Cf,meshphong_frag:Pf,meshphysical_vert:Lf,meshphysical_frag:Df,meshtoon_vert:If,meshtoon_frag:Uf,points_vert:Nf,points_frag:Ff,shadow_vert:Of,shadow_frag:Bf,sprite_vert:zf,sprite_frag:Gf},ce={common:{diffuse:{value:new Ge(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ue},alphaMap:{value:null},alphaMapTransform:{value:new Ue},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ue}},envmap:{envMap:{value:null},envMapRotation:{value:new Ue},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ue}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ue}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ue},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ue},normalScale:{value:new Ye(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ue},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ue}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ue}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ue}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ge(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ge(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ue},alphaTest:{value:0},uvTransform:{value:new Ue}},sprite:{diffuse:{value:new Ge(16777215)},opacity:{value:1},center:{value:new Ye(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ue},alphaMap:{value:null},alphaMapTransform:{value:new Ue},alphaTest:{value:0}}},Kt={basic:{uniforms:Rt([ce.common,ce.specularmap,ce.envmap,ce.aomap,ce.lightmap,ce.fog]),vertexShader:Ne.meshbasic_vert,fragmentShader:Ne.meshbasic_frag},lambert:{uniforms:Rt([ce.common,ce.specularmap,ce.envmap,ce.aomap,ce.lightmap,ce.emissivemap,ce.bumpmap,ce.normalmap,ce.displacementmap,ce.fog,ce.lights,{emissive:{value:new Ge(0)},envMapIntensity:{value:1}}]),vertexShader:Ne.meshlambert_vert,fragmentShader:Ne.meshlambert_frag},phong:{uniforms:Rt([ce.common,ce.specularmap,ce.envmap,ce.aomap,ce.lightmap,ce.emissivemap,ce.bumpmap,ce.normalmap,ce.displacementmap,ce.fog,ce.lights,{emissive:{value:new Ge(0)},specular:{value:new Ge(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Ne.meshphong_vert,fragmentShader:Ne.meshphong_frag},standard:{uniforms:Rt([ce.common,ce.envmap,ce.aomap,ce.lightmap,ce.emissivemap,ce.bumpmap,ce.normalmap,ce.displacementmap,ce.roughnessmap,ce.metalnessmap,ce.fog,ce.lights,{emissive:{value:new Ge(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Ne.meshphysical_vert,fragmentShader:Ne.meshphysical_frag},toon:{uniforms:Rt([ce.common,ce.aomap,ce.lightmap,ce.emissivemap,ce.bumpmap,ce.normalmap,ce.displacementmap,ce.gradientmap,ce.fog,ce.lights,{emissive:{value:new Ge(0)}}]),vertexShader:Ne.meshtoon_vert,fragmentShader:Ne.meshtoon_frag},matcap:{uniforms:Rt([ce.common,ce.bumpmap,ce.normalmap,ce.displacementmap,ce.fog,{matcap:{value:null}}]),vertexShader:Ne.meshmatcap_vert,fragmentShader:Ne.meshmatcap_frag},points:{uniforms:Rt([ce.points,ce.fog]),vertexShader:Ne.points_vert,fragmentShader:Ne.points_frag},dashed:{uniforms:Rt([ce.common,ce.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Ne.linedashed_vert,fragmentShader:Ne.linedashed_frag},depth:{uniforms:Rt([ce.common,ce.displacementmap]),vertexShader:Ne.depth_vert,fragmentShader:Ne.depth_frag},normal:{uniforms:Rt([ce.common,ce.bumpmap,ce.normalmap,ce.displacementmap,{opacity:{value:1}}]),vertexShader:Ne.meshnormal_vert,fragmentShader:Ne.meshnormal_frag},sprite:{uniforms:Rt([ce.sprite,ce.fog]),vertexShader:Ne.sprite_vert,fragmentShader:Ne.sprite_frag},background:{uniforms:{uvTransform:{value:new Ue},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Ne.background_vert,fragmentShader:Ne.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ue}},vertexShader:Ne.backgroundCube_vert,fragmentShader:Ne.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Ne.cube_vert,fragmentShader:Ne.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Ne.equirect_vert,fragmentShader:Ne.equirect_frag},distance:{uniforms:Rt([ce.common,ce.displacementmap,{referencePosition:{value:new B},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Ne.distance_vert,fragmentShader:Ne.distance_frag},shadow:{uniforms:Rt([ce.lights,ce.fog,{color:{value:new Ge(0)},opacity:{value:1}}]),vertexShader:Ne.shadow_vert,fragmentShader:Ne.shadow_frag}};Kt.physical={uniforms:Rt([Kt.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ue},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ue},clearcoatNormalScale:{value:new Ye(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ue},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ue},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ue},sheen:{value:0},sheenColor:{value:new Ge(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ue},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ue},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ue},transmissionSamplerSize:{value:new Ye},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ue},attenuationDistance:{value:0},attenuationColor:{value:new Ge(0)},specularColor:{value:new Ge(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ue},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ue},anisotropyVector:{value:new Ye},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ue}}]),vertexShader:Ne.meshphysical_vert,fragmentShader:Ne.meshphysical_frag};const _r={r:0,b:0,g:0},On=new nn,Vf=new at;function kf(i,e,t,n,r,a){const s=new Ge(0);let o=r===!0?0:1,c,l,f=null,d=0,h=null;function p(M){let b=M.isScene===!0?M.background:null;if(b&&b.isTexture){const T=M.backgroundBlurriness>0;b=e.get(b,T)}return b}function g(M){let b=!1;const T=p(M);T===null?m(s,o):T&&T.isColor&&(m(T,1),b=!0);const P=i.xr.getEnvironmentBlendMode();P==="additive"?t.buffers.color.setClear(0,0,0,1,a):P==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,a),(i.autoClear||b)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function S(M,b){const T=p(b);T&&(T.isCubeTexture||T.mapping===Or)?(l===void 0&&(l=new Bt(new ki(1,1,1),new rn({name:"BackgroundCubeMaterial",uniforms:gi(Kt.backgroundCube.uniforms),vertexShader:Kt.backgroundCube.vertexShader,fragmentShader:Kt.backgroundCube.fragmentShader,side:wt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),l.geometry.deleteAttribute("uv"),l.onBeforeRender=function(P,R,L){this.matrixWorld.copyPosition(L.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(l)),On.copy(b.backgroundRotation),On.x*=-1,On.y*=-1,On.z*=-1,T.isCubeTexture&&T.isRenderTargetTexture===!1&&(On.y*=-1,On.z*=-1),l.material.uniforms.envMap.value=T,l.material.uniforms.flipEnvMap.value=T.isCubeTexture&&T.isRenderTargetTexture===!1?-1:1,l.material.uniforms.backgroundBlurriness.value=b.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=b.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(Vf.makeRotationFromEuler(On)),l.material.toneMapped=Xe.getTransfer(T.colorSpace)!==je,(f!==T||d!==T.version||h!==i.toneMapping)&&(l.material.needsUpdate=!0,f=T,d=T.version,h=i.toneMapping),l.layers.enableAll(),M.unshift(l,l.geometry,l.material,0,0,null)):T&&T.isTexture&&(c===void 0&&(c=new Bt(new zr(2,2),new rn({name:"BackgroundMaterial",uniforms:gi(Kt.background.uniforms),vertexShader:Kt.background.vertexShader,fragmentShader:Kt.background.fragmentShader,side:Pn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(c)),c.material.uniforms.t2D.value=T,c.material.uniforms.backgroundIntensity.value=b.backgroundIntensity,c.material.toneMapped=Xe.getTransfer(T.colorSpace)!==je,T.matrixAutoUpdate===!0&&T.updateMatrix(),c.material.uniforms.uvTransform.value.copy(T.matrix),(f!==T||d!==T.version||h!==i.toneMapping)&&(c.material.needsUpdate=!0,f=T,d=T.version,h=i.toneMapping),c.layers.enableAll(),M.unshift(c,c.geometry,c.material,0,0,null))}function m(M,b){M.getRGB(_r,rc(i)),t.buffers.color.setClear(_r.r,_r.g,_r.b,b,a)}function u(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return s},setClearColor:function(M,b=1){s.set(M),o=b,m(s,o)},getClearAlpha:function(){return o},setClearAlpha:function(M){o=M,m(s,o)},render:g,addToRenderList:S,dispose:u}}function Hf(i,e){const t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},r=h(null);let a=r,s=!1;function o(w,k,z,Y,V){let H=!1;const N=d(w,Y,z,k);a!==N&&(a=N,l(a.object)),H=p(w,Y,z,V),H&&g(w,Y,z,V),V!==null&&e.update(V,i.ELEMENT_ARRAY_BUFFER),(H||s)&&(s=!1,T(w,k,z,Y),V!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(V).buffer))}function c(){return i.createVertexArray()}function l(w){return i.bindVertexArray(w)}function f(w){return i.deleteVertexArray(w)}function d(w,k,z,Y){const V=Y.wireframe===!0;let H=n[k.id];H===void 0&&(H={},n[k.id]=H);const N=w.isInstancedMesh===!0?w.id:0;let te=H[N];te===void 0&&(te={},H[N]=te);let j=te[z.id];j===void 0&&(j={},te[z.id]=j);let he=j[V];return he===void 0&&(he=h(c()),j[V]=he),he}function h(w){const k=[],z=[],Y=[];for(let V=0;V<t;V++)k[V]=0,z[V]=0,Y[V]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:k,enabledAttributes:z,attributeDivisors:Y,object:w,attributes:{},index:null}}function p(w,k,z,Y){const V=a.attributes,H=k.attributes;let N=0;const te=z.getAttributes();for(const j in te)if(te[j].location>=0){const J=V[j];let ie=H[j];if(ie===void 0&&(j==="instanceMatrix"&&w.instanceMatrix&&(ie=w.instanceMatrix),j==="instanceColor"&&w.instanceColor&&(ie=w.instanceColor)),J===void 0||J.attribute!==ie||ie&&J.data!==ie.data)return!0;N++}return a.attributesNum!==N||a.index!==Y}function g(w,k,z,Y){const V={},H=k.attributes;let N=0;const te=z.getAttributes();for(const j in te)if(te[j].location>=0){let J=H[j];J===void 0&&(j==="instanceMatrix"&&w.instanceMatrix&&(J=w.instanceMatrix),j==="instanceColor"&&w.instanceColor&&(J=w.instanceColor));const ie={};ie.attribute=J,J&&J.data&&(ie.data=J.data),V[j]=ie,N++}a.attributes=V,a.attributesNum=N,a.index=Y}function S(){const w=a.newAttributes;for(let k=0,z=w.length;k<z;k++)w[k]=0}function m(w){u(w,0)}function u(w,k){const z=a.newAttributes,Y=a.enabledAttributes,V=a.attributeDivisors;z[w]=1,Y[w]===0&&(i.enableVertexAttribArray(w),Y[w]=1),V[w]!==k&&(i.vertexAttribDivisor(w,k),V[w]=k)}function M(){const w=a.newAttributes,k=a.enabledAttributes;for(let z=0,Y=k.length;z<Y;z++)k[z]!==w[z]&&(i.disableVertexAttribArray(z),k[z]=0)}function b(w,k,z,Y,V,H,N){N===!0?i.vertexAttribIPointer(w,k,z,V,H):i.vertexAttribPointer(w,k,z,Y,V,H)}function T(w,k,z,Y){S();const V=Y.attributes,H=z.getAttributes(),N=k.defaultAttributeValues;for(const te in H){const j=H[te];if(j.location>=0){let he=V[te];if(he===void 0&&(te==="instanceMatrix"&&w.instanceMatrix&&(he=w.instanceMatrix),te==="instanceColor"&&w.instanceColor&&(he=w.instanceColor)),he!==void 0){const J=he.normalized,ie=he.itemSize,Ae=e.get(he);if(Ae===void 0)continue;const ke=Ae.buffer,Ve=Ae.type,X=Ae.bytesPerElement,ne=Ve===i.INT||Ve===i.UNSIGNED_INT||he.gpuType===Ns;if(he.isInterleavedBufferAttribute){const le=he.data,Ie=le.stride,Re=he.offset;if(le.isInstancedInterleavedBuffer){for(let Ce=0;Ce<j.locationSize;Ce++)u(j.location+Ce,le.meshPerAttribute);w.isInstancedMesh!==!0&&Y._maxInstanceCount===void 0&&(Y._maxInstanceCount=le.meshPerAttribute*le.count)}else for(let Ce=0;Ce<j.locationSize;Ce++)m(j.location+Ce);i.bindBuffer(i.ARRAY_BUFFER,ke);for(let Ce=0;Ce<j.locationSize;Ce++)b(j.location+Ce,ie/j.locationSize,Ve,J,Ie*X,(Re+ie/j.locationSize*Ce)*X,ne)}else{if(he.isInstancedBufferAttribute){for(let le=0;le<j.locationSize;le++)u(j.location+le,he.meshPerAttribute);w.isInstancedMesh!==!0&&Y._maxInstanceCount===void 0&&(Y._maxInstanceCount=he.meshPerAttribute*he.count)}else for(let le=0;le<j.locationSize;le++)m(j.location+le);i.bindBuffer(i.ARRAY_BUFFER,ke);for(let le=0;le<j.locationSize;le++)b(j.location+le,ie/j.locationSize,Ve,J,ie*X,ie/j.locationSize*le*X,ne)}}else if(N!==void 0){const J=N[te];if(J!==void 0)switch(J.length){case 2:i.vertexAttrib2fv(j.location,J);break;case 3:i.vertexAttrib3fv(j.location,J);break;case 4:i.vertexAttrib4fv(j.location,J);break;default:i.vertexAttrib1fv(j.location,J)}}}}M()}function P(){E();for(const w in n){const k=n[w];for(const z in k){const Y=k[z];for(const V in Y){const H=Y[V];for(const N in H)f(H[N].object),delete H[N];delete Y[V]}}delete n[w]}}function R(w){if(n[w.id]===void 0)return;const k=n[w.id];for(const z in k){const Y=k[z];for(const V in Y){const H=Y[V];for(const N in H)f(H[N].object),delete H[N];delete Y[V]}}delete n[w.id]}function L(w){for(const k in n){const z=n[k];for(const Y in z){const V=z[Y];if(V[w.id]===void 0)continue;const H=V[w.id];for(const N in H)f(H[N].object),delete H[N];delete V[w.id]}}}function v(w){for(const k in n){const z=n[k],Y=w.isInstancedMesh===!0?w.id:0,V=z[Y];if(V!==void 0){for(const H in V){const N=V[H];for(const te in N)f(N[te].object),delete N[te];delete V[H]}delete z[Y],Object.keys(z).length===0&&delete n[k]}}}function E(){O(),s=!0,a!==r&&(a=r,l(a.object))}function O(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:o,reset:E,resetDefaultState:O,dispose:P,releaseStatesOfGeometry:R,releaseStatesOfObject:v,releaseStatesOfProgram:L,initAttributes:S,enableAttribute:m,disableUnusedAttributes:M}}function Wf(i,e,t){let n;function r(l){n=l}function a(l,f){i.drawArrays(n,l,f),t.update(f,n,1)}function s(l,f,d){d!==0&&(i.drawArraysInstanced(n,l,f,d),t.update(f,n,d))}function o(l,f,d){if(d===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,f,0,d);let p=0;for(let g=0;g<d;g++)p+=f[g];t.update(p,n,1)}function c(l,f,d,h){if(d===0)return;const p=e.get("WEBGL_multi_draw");if(p===null)for(let g=0;g<l.length;g++)s(l[g],f[g],h[g]);else{p.multiDrawArraysInstancedWEBGL(n,l,0,f,0,h,0,d);let g=0;for(let S=0;S<d;S++)g+=f[S]*h[S];t.update(g,n,1)}}this.setMode=r,this.render=a,this.renderInstances=s,this.renderMultiDraw=o,this.renderMultiDrawInstances=c}function Xf(i,e,t,n){let r;function a(){if(r!==void 0)return r;if(e.has("EXT_texture_filter_anisotropic")===!0){const L=e.get("EXT_texture_filter_anisotropic");r=i.getParameter(L.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function s(L){return!(L!==Xt&&n.convert(L)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(L){const v=L===gn&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(L!==It&&n.convert(L)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&L!==Zt&&!v)}function c(L){if(L==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";L="mediump"}return L==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=t.precision!==void 0?t.precision:"highp";const f=c(l);f!==l&&(Le("WebGLRenderer:",l,"not supported, using",f,"instead."),l=f);const d=t.logarithmicDepthBuffer===!0,h=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),p=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),S=i.getParameter(i.MAX_TEXTURE_SIZE),m=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),u=i.getParameter(i.MAX_VERTEX_ATTRIBS),M=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),b=i.getParameter(i.MAX_VARYING_VECTORS),T=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),P=i.getParameter(i.MAX_SAMPLES),R=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:c,textureFormatReadable:s,textureTypeReadable:o,precision:l,logarithmicDepthBuffer:d,reversedDepthBuffer:h,maxTextures:p,maxVertexTextures:g,maxTextureSize:S,maxCubemapSize:m,maxAttributes:u,maxVertexUniforms:M,maxVaryings:b,maxFragmentUniforms:T,maxSamples:P,samples:R}}function qf(i){const e=this;let t=null,n=0,r=!1,a=!1;const s=new zn,o=new Ue,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(d,h){const p=d.length!==0||h||n!==0||r;return r=h,n=d.length,p},this.beginShadows=function(){a=!0,f(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(d,h){t=f(d,h,0)},this.setState=function(d,h,p){const g=d.clippingPlanes,S=d.clipIntersection,m=d.clipShadows,u=i.get(d);if(!r||g===null||g.length===0||a&&!m)a?f(null):l();else{const M=a?0:n,b=M*4;let T=u.clippingState||null;c.value=T,T=f(g,h,b,p);for(let P=0;P!==b;++P)T[P]=t[P];u.clippingState=T,this.numIntersection=S?this.numPlanes:0,this.numPlanes+=M}};function l(){c.value!==t&&(c.value=t,c.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function f(d,h,p,g){const S=d!==null?d.length:0;let m=null;if(S!==0){if(m=c.value,g!==!0||m===null){const u=p+S*4,M=h.matrixWorldInverse;o.getNormalMatrix(M),(m===null||m.length<u)&&(m=new Float32Array(u));for(let b=0,T=p;b!==S;++b,T+=4)s.copy(d[b]).applyMatrix4(M,o),s.normal.toArray(m,T),m[T+3]=s.constant}c.value=m,c.needsUpdate=!0}return e.numPlanes=S,e.numIntersection=0,m}}const Cn=4,Zo=[.125,.215,.35,.446,.526,.582],Vn=20,Yf=256,Ri=new $s,jo=new Ge;let Ma=null,Sa=0,Ea=0,ya=!1;const $f=new B;class Jo{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,r=100,a={}){const{size:s=256,position:o=$f}=a;Ma=this._renderer.getRenderTarget(),Sa=this._renderer.getActiveCubeFace(),Ea=this._renderer.getActiveMipmapLevel(),ya=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(s);const c=this._allocateTargets();return c.depthBuffer=!0,this._sceneToCubeUV(e,n,r,c,o),t>0&&this._blur(c,0,0,t),this._applyPMREM(c),this._cleanup(c),c}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=tl(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=el(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Ma,Sa,Ea),this._renderer.xr.enabled=ya,e.scissorTest=!1,li(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Xn||e.mapping===pi?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Ma=this._renderer.getRenderTarget(),Sa=this._renderer.getActiveCubeFace(),Ea=this._renderer.getActiveMipmapLevel(),ya=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:bt,minFilter:bt,generateMipmaps:!1,type:gn,format:Xt,colorSpace:_i,depthBuffer:!1},r=Qo(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Qo(e,t,n);const{_lodMax:a}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=Kf(a)),this._blurMaterial=jf(a,e,t),this._ggxMaterial=Zf(a,e,t)}return r}_compileMaterial(e){const t=new Bt(new zt,e);this._renderer.compile(t,Ri)}_sceneToCubeUV(e,t,n,r,a){const c=new Ot(90,1,t,n),l=[1,-1,1,1,1,1],f=[1,1,1,-1,-1,-1],d=this._renderer,h=d.autoClear,p=d.toneMapping;d.getClearColor(jo),d.toneMapping=Jt,d.autoClear=!1,d.state.buffers.depth.getReversed()&&(d.setRenderTarget(r),d.clearDepth(),d.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Bt(new ki,new Ir({name:"PMREM.Background",side:wt,depthWrite:!1,depthTest:!1})));const S=this._backgroundBox,m=S.material;let u=!1;const M=e.background;M?M.isColor&&(m.color.copy(M),e.background=null,u=!0):(m.color.copy(jo),u=!0);for(let b=0;b<6;b++){const T=b%3;T===0?(c.up.set(0,l[b],0),c.position.set(a.x,a.y,a.z),c.lookAt(a.x+f[b],a.y,a.z)):T===1?(c.up.set(0,0,l[b]),c.position.set(a.x,a.y,a.z),c.lookAt(a.x,a.y+f[b],a.z)):(c.up.set(0,l[b],0),c.position.set(a.x,a.y,a.z),c.lookAt(a.x,a.y,a.z+f[b]));const P=this._cubeSize;li(r,T*P,b>2?P:0,P,P),d.setRenderTarget(r),u&&d.render(S,c),d.render(e,c)}d.toneMapping=p,d.autoClear=h,e.background=M}_textureToCubeUV(e,t){const n=this._renderer,r=e.mapping===Xn||e.mapping===pi;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=tl()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=el());const a=r?this._cubemapMaterial:this._equirectMaterial,s=this._lodMeshes[0];s.material=a;const o=a.uniforms;o.envMap.value=e;const c=this._cubeSize;li(t,0,0,3*c,2*c),n.setRenderTarget(t),n.render(s,Ri)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const r=this._lodMeshes.length;for(let a=1;a<r;a++)this._applyGGXFilter(e,a-1,a);t.autoClear=n}_applyGGXFilter(e,t,n){const r=this._renderer,a=this._pingPongRenderTarget,s=this._ggxMaterial,o=this._lodMeshes[n];o.material=s;const c=s.uniforms,l=n/(this._lodMeshes.length-1),f=t/(this._lodMeshes.length-1),d=Math.sqrt(l*l-f*f),h=0+l*1.25,p=d*h,{_lodMax:g}=this,S=this._sizeLods[n],m=3*S*(n>g-Cn?n-g+Cn:0),u=4*(this._cubeSize-S);c.envMap.value=e.texture,c.roughness.value=p,c.mipInt.value=g-t,li(a,m,u,3*S,2*S),r.setRenderTarget(a),r.render(o,Ri),c.envMap.value=a.texture,c.roughness.value=0,c.mipInt.value=g-n,li(e,m,u,3*S,2*S),r.setRenderTarget(e),r.render(o,Ri)}_blur(e,t,n,r,a){const s=this._pingPongRenderTarget;this._halfBlur(e,s,t,n,r,"latitudinal",a),this._halfBlur(s,e,n,n,r,"longitudinal",a)}_halfBlur(e,t,n,r,a,s,o){const c=this._renderer,l=this._blurMaterial;s!=="latitudinal"&&s!=="longitudinal"&&We("blur direction must be either latitudinal or longitudinal!");const f=3,d=this._lodMeshes[r];d.material=l;const h=l.uniforms,p=this._sizeLods[n]-1,g=isFinite(a)?Math.PI/(2*p):2*Math.PI/(2*Vn-1),S=a/g,m=isFinite(a)?1+Math.floor(f*S):Vn;m>Vn&&Le(`sigmaRadians, ${a}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Vn}`);const u=[];let M=0;for(let L=0;L<Vn;++L){const v=L/S,E=Math.exp(-v*v/2);u.push(E),L===0?M+=E:L<m&&(M+=2*E)}for(let L=0;L<u.length;L++)u[L]=u[L]/M;h.envMap.value=e.texture,h.samples.value=m,h.weights.value=u,h.latitudinal.value=s==="latitudinal",o&&(h.poleAxis.value=o);const{_lodMax:b}=this;h.dTheta.value=g,h.mipInt.value=b-n;const T=this._sizeLods[r],P=3*T*(r>b-Cn?r-b+Cn:0),R=4*(this._cubeSize-T);li(t,P,R,3*T,2*T),c.setRenderTarget(t),c.render(d,Ri)}}function Kf(i){const e=[],t=[],n=[];let r=i;const a=i-Cn+1+Zo.length;for(let s=0;s<a;s++){const o=Math.pow(2,r);e.push(o);let c=1/o;s>i-Cn?c=Zo[s-i+Cn-1]:s===0&&(c=0),t.push(c);const l=1/(o-2),f=-l,d=1+l,h=[f,f,d,f,d,d,f,f,d,d,f,d],p=6,g=6,S=3,m=2,u=1,M=new Float32Array(S*g*p),b=new Float32Array(m*g*p),T=new Float32Array(u*g*p);for(let R=0;R<p;R++){const L=R%3*2/3-1,v=R>2?0:-1,E=[L,v,0,L+2/3,v,0,L+2/3,v+1,0,L,v,0,L+2/3,v+1,0,L,v+1,0];M.set(E,S*g*R),b.set(h,m*g*R);const O=[R,R,R,R,R,R];T.set(O,u*g*R)}const P=new zt;P.setAttribute("position",new en(M,S)),P.setAttribute("uv",new en(b,m)),P.setAttribute("faceIndex",new en(T,u)),n.push(new Bt(P,null)),r>Cn&&r--}return{lodMeshes:n,sizeLods:e,sigmas:t}}function Qo(i,e,t){const n=new Qt(i,e,t);return n.texture.mapping=Or,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function li(i,e,t,n,r){i.viewport.set(e,t,n,r),i.scissor.set(e,t,n,r)}function Zf(i,e,t){return new rn({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:Yf,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Gr(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:mn,depthTest:!1,depthWrite:!1})}function jf(i,e,t){const n=new Float32Array(Vn),r=new B(0,1,0);return new rn({name:"SphericalGaussianBlur",defines:{n:Vn,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:Gr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:mn,depthTest:!1,depthWrite:!1})}function el(){return new rn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Gr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:mn,depthTest:!1,depthWrite:!1})}function tl(){return new rn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Gr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:mn,depthTest:!1,depthWrite:!1})}function Gr(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}class lc extends Qt{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new nc(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new ki(5,5,5),a=new rn({name:"CubemapFromEquirect",uniforms:gi(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:wt,blending:mn});a.uniforms.tEquirect.value=t;const s=new Bt(r,a),o=t.minFilter;return t.minFilter===Hn&&(t.minFilter=bt),new nd(1,10,this).update(e,s),t.minFilter=o,s.geometry.dispose(),s.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){const a=e.getRenderTarget();for(let s=0;s<6;s++)e.setRenderTarget(this,s),e.clear(t,n,r);e.setRenderTarget(a)}}function Jf(i){let e=new WeakMap,t=new WeakMap,n=null;function r(h,p=!1){return h==null?null:p?s(h):a(h)}function a(h){if(h&&h.isTexture){const p=h.mapping;if(p===Xr||p===qr)if(e.has(h)){const g=e.get(h).texture;return o(g,h.mapping)}else{const g=h.image;if(g&&g.height>0){const S=new lc(g.height);return S.fromEquirectangularTexture(i,h),e.set(h,S),h.addEventListener("dispose",l),o(S.texture,h.mapping)}else return null}}return h}function s(h){if(h&&h.isTexture){const p=h.mapping,g=p===Xr||p===qr,S=p===Xn||p===pi;if(g||S){let m=t.get(h);const u=m!==void 0?m.texture.pmremVersion:0;if(h.isRenderTargetTexture&&h.pmremVersion!==u)return n===null&&(n=new Jo(i)),m=g?n.fromEquirectangular(h,m):n.fromCubemap(h,m),m.texture.pmremVersion=h.pmremVersion,t.set(h,m),m.texture;if(m!==void 0)return m.texture;{const M=h.image;return g&&M&&M.height>0||S&&M&&c(M)?(n===null&&(n=new Jo(i)),m=g?n.fromEquirectangular(h):n.fromCubemap(h),m.texture.pmremVersion=h.pmremVersion,t.set(h,m),h.addEventListener("dispose",f),m.texture):null}}}return h}function o(h,p){return p===Xr?h.mapping=Xn:p===qr&&(h.mapping=pi),h}function c(h){let p=0;const g=6;for(let S=0;S<g;S++)h[S]!==void 0&&p++;return p===g}function l(h){const p=h.target;p.removeEventListener("dispose",l);const g=e.get(p);g!==void 0&&(e.delete(p),g.dispose())}function f(h){const p=h.target;p.removeEventListener("dispose",f);const g=t.get(p);g!==void 0&&(t.delete(p),g.dispose())}function d(){e=new WeakMap,t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:r,dispose:d}}function Qf(i){const e={};function t(n){if(e[n]!==void 0)return e[n];const r=i.getExtension(n);return e[n]=r,r}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const r=t(n);return r===null&&Dr("WebGLRenderer: "+n+" extension not supported."),r}}}function ep(i,e,t,n){const r={},a=new WeakMap;function s(d){const h=d.target;h.index!==null&&e.remove(h.index);for(const g in h.attributes)e.remove(h.attributes[g]);h.removeEventListener("dispose",s),delete r[h.id];const p=a.get(h);p&&(e.remove(p),a.delete(h)),n.releaseStatesOfGeometry(h),h.isInstancedBufferGeometry===!0&&delete h._maxInstanceCount,t.memory.geometries--}function o(d,h){return r[h.id]===!0||(h.addEventListener("dispose",s),r[h.id]=!0,t.memory.geometries++),h}function c(d){const h=d.attributes;for(const p in h)e.update(h[p],i.ARRAY_BUFFER)}function l(d){const h=[],p=d.index,g=d.attributes.position;let S=0;if(g===void 0)return;if(p!==null){const M=p.array;S=p.version;for(let b=0,T=M.length;b<T;b+=3){const P=M[b+0],R=M[b+1],L=M[b+2];h.push(P,R,R,L,L,P)}}else{const M=g.array;S=g.version;for(let b=0,T=M.length/3-1;b<T;b+=3){const P=b+0,R=b+1,L=b+2;h.push(P,R,R,L,L,P)}}const m=new(g.count>=65535?ec:Ql)(h,1);m.version=S;const u=a.get(d);u&&e.remove(u),a.set(d,m)}function f(d){const h=a.get(d);if(h){const p=d.index;p!==null&&h.version<p.version&&l(d)}else l(d);return a.get(d)}return{get:o,update:c,getWireframeAttribute:f}}function tp(i,e,t){let n;function r(h){n=h}let a,s;function o(h){a=h.type,s=h.bytesPerElement}function c(h,p){i.drawElements(n,p,a,h*s),t.update(p,n,1)}function l(h,p,g){g!==0&&(i.drawElementsInstanced(n,p,a,h*s,g),t.update(p,n,g))}function f(h,p,g){if(g===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,p,0,a,h,0,g);let m=0;for(let u=0;u<g;u++)m+=p[u];t.update(m,n,1)}function d(h,p,g,S){if(g===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let u=0;u<h.length;u++)l(h[u]/s,p[u],S[u]);else{m.multiDrawElementsInstancedWEBGL(n,p,0,a,h,0,S,0,g);let u=0;for(let M=0;M<g;M++)u+=p[M]*S[M];t.update(u,n,1)}}this.setMode=r,this.setIndex=o,this.render=c,this.renderInstances=l,this.renderMultiDraw=f,this.renderMultiDrawInstances=d}function np(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(a,s,o){switch(t.calls++,s){case i.TRIANGLES:t.triangles+=o*(a/3);break;case i.LINES:t.lines+=o*(a/2);break;case i.LINE_STRIP:t.lines+=o*(a-1);break;case i.LINE_LOOP:t.lines+=o*a;break;case i.POINTS:t.points+=o*a;break;default:We("WebGLInfo: Unknown draw mode:",s);break}}function r(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:r,update:n}}function ip(i,e,t){const n=new WeakMap,r=new ot;function a(s,o,c){const l=s.morphTargetInfluences,f=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,d=f!==void 0?f.length:0;let h=n.get(o);if(h===void 0||h.count!==d){let O=function(){v.dispose(),n.delete(o),o.removeEventListener("dispose",O)};var p=O;h!==void 0&&h.texture.dispose();const g=o.morphAttributes.position!==void 0,S=o.morphAttributes.normal!==void 0,m=o.morphAttributes.color!==void 0,u=o.morphAttributes.position||[],M=o.morphAttributes.normal||[],b=o.morphAttributes.color||[];let T=0;g===!0&&(T=1),S===!0&&(T=2),m===!0&&(T=3);let P=o.attributes.position.count*T,R=1;P>e.maxTextureSize&&(R=Math.ceil(P/e.maxTextureSize),P=e.maxTextureSize);const L=new Float32Array(P*R*4*d),v=new jl(L,P,R,d);v.type=Zt,v.needsUpdate=!0;const E=T*4;for(let w=0;w<d;w++){const k=u[w],z=M[w],Y=b[w],V=P*R*4*w;for(let H=0;H<k.count;H++){const N=H*E;g===!0&&(r.fromBufferAttribute(k,H),L[V+N+0]=r.x,L[V+N+1]=r.y,L[V+N+2]=r.z,L[V+N+3]=0),S===!0&&(r.fromBufferAttribute(z,H),L[V+N+4]=r.x,L[V+N+5]=r.y,L[V+N+6]=r.z,L[V+N+7]=0),m===!0&&(r.fromBufferAttribute(Y,H),L[V+N+8]=r.x,L[V+N+9]=r.y,L[V+N+10]=r.z,L[V+N+11]=Y.itemSize===4?r.w:1)}}h={count:d,texture:v,size:new Ye(P,R)},n.set(o,h),o.addEventListener("dispose",O)}if(s.isInstancedMesh===!0&&s.morphTexture!==null)c.getUniforms().setValue(i,"morphTexture",s.morphTexture,t);else{let g=0;for(let m=0;m<l.length;m++)g+=l[m];const S=o.morphTargetsRelative?1:1-g;c.getUniforms().setValue(i,"morphTargetBaseInfluence",S),c.getUniforms().setValue(i,"morphTargetInfluences",l)}c.getUniforms().setValue(i,"morphTargetsTexture",h.texture,t),c.getUniforms().setValue(i,"morphTargetsTextureSize",h.size)}return{update:a}}function rp(i,e,t,n,r){let a=new WeakMap;function s(l){const f=r.render.frame,d=l.geometry,h=e.get(l,d);if(a.get(h)!==f&&(e.update(h),a.set(h,f)),l.isInstancedMesh&&(l.hasEventListener("dispose",c)===!1&&l.addEventListener("dispose",c),a.get(l)!==f&&(t.update(l.instanceMatrix,i.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,i.ARRAY_BUFFER),a.set(l,f))),l.isSkinnedMesh){const p=l.skeleton;a.get(p)!==f&&(p.update(),a.set(p,f))}return h}function o(){a=new WeakMap}function c(l){const f=l.target;f.removeEventListener("dispose",c),n.releaseStatesOfObject(f),t.remove(f.instanceMatrix),f.instanceColor!==null&&t.remove(f.instanceColor)}return{update:s,dispose:o}}const ap={[Ul]:"LINEAR_TONE_MAPPING",[Nl]:"REINHARD_TONE_MAPPING",[Fl]:"CINEON_TONE_MAPPING",[Ol]:"ACES_FILMIC_TONE_MAPPING",[zl]:"AGX_TONE_MAPPING",[Gl]:"NEUTRAL_TONE_MAPPING",[Bl]:"CUSTOM_TONE_MAPPING"};function sp(i,e,t,n,r){const a=new Qt(e,t,{type:i,depthBuffer:n,stencilBuffer:r}),s=new Qt(e,t,{type:gn,depthBuffer:!1,stencilBuffer:!1}),o=new zt;o.setAttribute("position",new Ut([-1,3,0,-1,-1,0,3,-1,0],3)),o.setAttribute("uv",new Ut([0,2,0,0,2,0],2));const c=new Wu({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),l=new Bt(o,c),f=new $s(-1,1,1,-1,0,1);let d=null,h=null,p=!1,g,S=null,m=[],u=!1;this.setSize=function(M,b){a.setSize(M,b),s.setSize(M,b);for(let T=0;T<m.length;T++){const P=m[T];P.setSize&&P.setSize(M,b)}},this.setEffects=function(M){m=M,u=m.length>0&&m[0].isRenderPass===!0;const b=a.width,T=a.height;for(let P=0;P<m.length;P++){const R=m[P];R.setSize&&R.setSize(b,T)}},this.begin=function(M,b){if(p||M.toneMapping===Jt&&m.length===0)return!1;if(S=b,b!==null){const T=b.width,P=b.height;(a.width!==T||a.height!==P)&&this.setSize(T,P)}return u===!1&&M.setRenderTarget(a),g=M.toneMapping,M.toneMapping=Jt,!0},this.hasRenderPass=function(){return u},this.end=function(M,b){M.toneMapping=g,p=!0;let T=a,P=s;for(let R=0;R<m.length;R++){const L=m[R];if(L.enabled!==!1&&(L.render(M,P,T,b),L.needsSwap!==!1)){const v=T;T=P,P=v}}if(d!==M.outputColorSpace||h!==M.toneMapping){d=M.outputColorSpace,h=M.toneMapping,c.defines={},Xe.getTransfer(d)===je&&(c.defines.SRGB_TRANSFER="");const R=ap[h];R&&(c.defines[R]=""),c.needsUpdate=!0}c.uniforms.tDiffuse.value=T.texture,M.setRenderTarget(S),M.render(l,f),S=null,p=!1},this.isCompositing=function(){return p},this.dispose=function(){a.dispose(),s.dispose(),o.dispose(),c.dispose()}}const cc=new At,ys=new zi(1,1),uc=new jl,dc=new Mu,hc=new nc,nl=[],il=[],rl=new Float32Array(16),al=new Float32Array(9),sl=new Float32Array(4);function Si(i,e,t){const n=i[0];if(n<=0||n>0)return i;const r=e*t;let a=nl[r];if(a===void 0&&(a=new Float32Array(r),nl[r]=a),e!==0){n.toArray(a,0);for(let s=1,o=0;s!==e;++s)o+=t,i[s].toArray(a,o)}return a}function pt(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function mt(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function Vr(i,e){let t=il[e];t===void 0&&(t=new Int32Array(e),il[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function op(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function lp(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(pt(t,e))return;i.uniform2fv(this.addr,e),mt(t,e)}}function cp(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(pt(t,e))return;i.uniform3fv(this.addr,e),mt(t,e)}}function up(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(pt(t,e))return;i.uniform4fv(this.addr,e),mt(t,e)}}function dp(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(pt(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),mt(t,e)}else{if(pt(t,n))return;sl.set(n),i.uniformMatrix2fv(this.addr,!1,sl),mt(t,n)}}function hp(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(pt(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),mt(t,e)}else{if(pt(t,n))return;al.set(n),i.uniformMatrix3fv(this.addr,!1,al),mt(t,n)}}function fp(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(pt(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),mt(t,e)}else{if(pt(t,n))return;rl.set(n),i.uniformMatrix4fv(this.addr,!1,rl),mt(t,n)}}function pp(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function mp(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(pt(t,e))return;i.uniform2iv(this.addr,e),mt(t,e)}}function _p(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(pt(t,e))return;i.uniform3iv(this.addr,e),mt(t,e)}}function gp(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(pt(t,e))return;i.uniform4iv(this.addr,e),mt(t,e)}}function vp(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function xp(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(pt(t,e))return;i.uniform2uiv(this.addr,e),mt(t,e)}}function Mp(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(pt(t,e))return;i.uniform3uiv(this.addr,e),mt(t,e)}}function Sp(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(pt(t,e))return;i.uniform4uiv(this.addr,e),mt(t,e)}}function Ep(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r);let a;this.type===i.SAMPLER_2D_SHADOW?(ys.compareFunction=t.isReversedDepthBuffer()?ks:Vs,a=ys):a=cc,t.setTexture2D(e||a,r)}function yp(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTexture3D(e||dc,r)}function Tp(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTextureCube(e||hc,r)}function bp(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTexture2DArray(e||uc,r)}function Ap(i){switch(i){case 5126:return op;case 35664:return lp;case 35665:return cp;case 35666:return up;case 35674:return dp;case 35675:return hp;case 35676:return fp;case 5124:case 35670:return pp;case 35667:case 35671:return mp;case 35668:case 35672:return _p;case 35669:case 35673:return gp;case 5125:return vp;case 36294:return xp;case 36295:return Mp;case 36296:return Sp;case 35678:case 36198:case 36298:case 36306:case 35682:return Ep;case 35679:case 36299:case 36307:return yp;case 35680:case 36300:case 36308:case 36293:return Tp;case 36289:case 36303:case 36311:case 36292:return bp}}function Rp(i,e){i.uniform1fv(this.addr,e)}function wp(i,e){const t=Si(e,this.size,2);i.uniform2fv(this.addr,t)}function Cp(i,e){const t=Si(e,this.size,3);i.uniform3fv(this.addr,t)}function Pp(i,e){const t=Si(e,this.size,4);i.uniform4fv(this.addr,t)}function Lp(i,e){const t=Si(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function Dp(i,e){const t=Si(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function Ip(i,e){const t=Si(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function Up(i,e){i.uniform1iv(this.addr,e)}function Np(i,e){i.uniform2iv(this.addr,e)}function Fp(i,e){i.uniform3iv(this.addr,e)}function Op(i,e){i.uniform4iv(this.addr,e)}function Bp(i,e){i.uniform1uiv(this.addr,e)}function zp(i,e){i.uniform2uiv(this.addr,e)}function Gp(i,e){i.uniform3uiv(this.addr,e)}function Vp(i,e){i.uniform4uiv(this.addr,e)}function kp(i,e,t){const n=this.cache,r=e.length,a=Vr(t,r);pt(n,a)||(i.uniform1iv(this.addr,a),mt(n,a));let s;this.type===i.SAMPLER_2D_SHADOW?s=ys:s=cc;for(let o=0;o!==r;++o)t.setTexture2D(e[o]||s,a[o])}function Hp(i,e,t){const n=this.cache,r=e.length,a=Vr(t,r);pt(n,a)||(i.uniform1iv(this.addr,a),mt(n,a));for(let s=0;s!==r;++s)t.setTexture3D(e[s]||dc,a[s])}function Wp(i,e,t){const n=this.cache,r=e.length,a=Vr(t,r);pt(n,a)||(i.uniform1iv(this.addr,a),mt(n,a));for(let s=0;s!==r;++s)t.setTextureCube(e[s]||hc,a[s])}function Xp(i,e,t){const n=this.cache,r=e.length,a=Vr(t,r);pt(n,a)||(i.uniform1iv(this.addr,a),mt(n,a));for(let s=0;s!==r;++s)t.setTexture2DArray(e[s]||uc,a[s])}function qp(i){switch(i){case 5126:return Rp;case 35664:return wp;case 35665:return Cp;case 35666:return Pp;case 35674:return Lp;case 35675:return Dp;case 35676:return Ip;case 5124:case 35670:return Up;case 35667:case 35671:return Np;case 35668:case 35672:return Fp;case 35669:case 35673:return Op;case 5125:return Bp;case 36294:return zp;case 36295:return Gp;case 36296:return Vp;case 35678:case 36198:case 36298:case 36306:case 35682:return kp;case 35679:case 36299:case 36307:return Hp;case 35680:case 36300:case 36308:case 36293:return Wp;case 36289:case 36303:case 36311:case 36292:return Xp}}class Yp{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Ap(t.type)}}class $p{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=qp(t.type)}}class Kp{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const r=this.seq;for(let a=0,s=r.length;a!==s;++a){const o=r[a];o.setValue(e,t[o.id],n)}}}const Ta=/(\w+)(\])?(\[|\.)?/g;function ol(i,e){i.seq.push(e),i.map[e.id]=e}function Zp(i,e,t){const n=i.name,r=n.length;for(Ta.lastIndex=0;;){const a=Ta.exec(n),s=Ta.lastIndex;let o=a[1];const c=a[2]==="]",l=a[3];if(c&&(o=o|0),l===void 0||l==="["&&s+2===r){ol(t,l===void 0?new Yp(o,i,e):new $p(o,i,e));break}else{let d=t.map[o];d===void 0&&(d=new Kp(o),ol(t,d)),t=d}}}class Ar{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let s=0;s<n;++s){const o=e.getActiveUniform(t,s),c=e.getUniformLocation(t,o.name);Zp(o,c,this)}const r=[],a=[];for(const s of this.seq)s.type===e.SAMPLER_2D_SHADOW||s.type===e.SAMPLER_CUBE_SHADOW||s.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(s):a.push(s);r.length>0&&(this.seq=r.concat(a))}setValue(e,t,n,r){const a=this.map[t];a!==void 0&&a.setValue(e,n,r)}setOptional(e,t,n){const r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let a=0,s=t.length;a!==s;++a){const o=t[a],c=n[o.id];c.needsUpdate!==!1&&o.setValue(e,c.value,r)}}static seqWithValue(e,t){const n=[];for(let r=0,a=e.length;r!==a;++r){const s=e[r];s.id in t&&n.push(s)}return n}}function ll(i,e,t){const n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}const jp=37297;let Jp=0;function Qp(i,e){const t=i.split(`
`),n=[],r=Math.max(e-6,0),a=Math.min(e+6,t.length);for(let s=r;s<a;s++){const o=s+1;n.push(`${o===e?">":" "} ${o}: ${t[s]}`)}return n.join(`
`)}const cl=new Ue;function em(i){Xe._getMatrix(cl,Xe.workingColorSpace,i);const e=`mat3( ${cl.elements.map(t=>t.toFixed(4))} )`;switch(Xe.getTransfer(i)){case Lr:return[e,"LinearTransferOETF"];case je:return[e,"sRGBTransferOETF"];default:return Le("WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function ul(i,e,t){const n=i.getShaderParameter(e,i.COMPILE_STATUS),a=(i.getShaderInfoLog(e)||"").trim();if(n&&a==="")return"";const s=/ERROR: 0:(\d+)/.exec(a);if(s){const o=parseInt(s[1]);return t.toUpperCase()+`

`+a+`

`+Qp(i.getShaderSource(e),o)}else return a}function tm(i,e){const t=em(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}const nm={[Ul]:"Linear",[Nl]:"Reinhard",[Fl]:"Cineon",[Ol]:"ACESFilmic",[zl]:"AgX",[Gl]:"Neutral",[Bl]:"Custom"};function im(i,e){const t=nm[e];return t===void 0?(Le("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const gr=new B;function rm(){Xe.getLuminanceCoefficients(gr);const i=gr.x.toFixed(4),e=gr.y.toFixed(4),t=gr.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function am(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Pi).join(`
`)}function sm(i){const e=[];for(const t in i){const n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function om(i,e){const t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let r=0;r<n;r++){const a=i.getActiveAttrib(e,r),s=a.name;let o=1;a.type===i.FLOAT_MAT2&&(o=2),a.type===i.FLOAT_MAT3&&(o=3),a.type===i.FLOAT_MAT4&&(o=4),t[s]={type:a.type,location:i.getAttribLocation(e,s),locationSize:o}}return t}function Pi(i){return i!==""}function dl(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function hl(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const lm=/^[ \t]*#include +<([\w\d./]+)>/gm;function Ts(i){return i.replace(lm,um)}const cm=new Map;function um(i,e){let t=Ne[e];if(t===void 0){const n=cm.get(e);if(n!==void 0)t=Ne[n],Le('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return Ts(t)}const dm=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function fl(i){return i.replace(dm,hm)}function hm(i,e,t,n){let r="";for(let a=parseInt(e);a<parseInt(t);a++)r+=n.replace(/\[\s*i\s*\]/g,"[ "+a+" ]").replace(/UNROLLED_LOOP_INDEX/g,a);return r}function pl(i){let e=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?e+=`
#define HIGH_PRECISION`:i.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}const fm={[Sr]:"SHADOWMAP_TYPE_PCF",[Ci]:"SHADOWMAP_TYPE_VSM"};function pm(i){return fm[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const mm={[Xn]:"ENVMAP_TYPE_CUBE",[pi]:"ENVMAP_TYPE_CUBE",[Or]:"ENVMAP_TYPE_CUBE_UV"};function _m(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":mm[i.envMapMode]||"ENVMAP_TYPE_CUBE"}const gm={[pi]:"ENVMAP_MODE_REFRACTION"};function vm(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":gm[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}const xm={[Us]:"ENVMAP_BLENDING_MULTIPLY",[Qc]:"ENVMAP_BLENDING_MIX",[eu]:"ENVMAP_BLENDING_ADD"};function Mm(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":xm[i.combine]||"ENVMAP_BLENDING_NONE"}function Sm(i){const e=i.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:n,maxMip:t}}function Em(i,e,t,n){const r=i.getContext(),a=t.defines;let s=t.vertexShader,o=t.fragmentShader;const c=pm(t),l=_m(t),f=vm(t),d=Mm(t),h=Sm(t),p=am(t),g=sm(a),S=r.createProgram();let m,u,M=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Pi).join(`
`),m.length>0&&(m+=`
`),u=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Pi).join(`
`),u.length>0&&(u+=`
`)):(m=[pl(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+f:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Pi).join(`
`),u=[pl(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+l:"",t.envMap?"#define "+f:"",t.envMap?"#define "+d:"",h?"#define CUBEUV_TEXEL_WIDTH "+h.texelWidth:"",h?"#define CUBEUV_TEXEL_HEIGHT "+h.texelHeight:"",h?"#define CUBEUV_MAX_MIP "+h.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Jt?"#define TONE_MAPPING":"",t.toneMapping!==Jt?Ne.tonemapping_pars_fragment:"",t.toneMapping!==Jt?im("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Ne.colorspace_pars_fragment,tm("linearToOutputTexel",t.outputColorSpace),rm(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Pi).join(`
`)),s=Ts(s),s=dl(s,t),s=hl(s,t),o=Ts(o),o=dl(o,t),o=hl(o,t),s=fl(s),o=fl(o),t.isRawShaderMaterial!==!0&&(M=`#version 300 es
`,m=[p,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,u=["#define varying in",t.glslVersion===yo?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===yo?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+u);const b=M+m+s,T=M+u+o,P=ll(r,r.VERTEX_SHADER,b),R=ll(r,r.FRAGMENT_SHADER,T);r.attachShader(S,P),r.attachShader(S,R),t.index0AttributeName!==void 0?r.bindAttribLocation(S,0,t.index0AttributeName):t.morphTargets===!0&&r.bindAttribLocation(S,0,"position"),r.linkProgram(S);function L(w){if(i.debug.checkShaderErrors){const k=r.getProgramInfoLog(S)||"",z=r.getShaderInfoLog(P)||"",Y=r.getShaderInfoLog(R)||"",V=k.trim(),H=z.trim(),N=Y.trim();let te=!0,j=!0;if(r.getProgramParameter(S,r.LINK_STATUS)===!1)if(te=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(r,S,P,R);else{const he=ul(r,P,"vertex"),J=ul(r,R,"fragment");We("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(S,r.VALIDATE_STATUS)+`

Material Name: `+w.name+`
Material Type: `+w.type+`

Program Info Log: `+V+`
`+he+`
`+J)}else V!==""?Le("WebGLProgram: Program Info Log:",V):(H===""||N==="")&&(j=!1);j&&(w.diagnostics={runnable:te,programLog:V,vertexShader:{log:H,prefix:m},fragmentShader:{log:N,prefix:u}})}r.deleteShader(P),r.deleteShader(R),v=new Ar(r,S),E=om(r,S)}let v;this.getUniforms=function(){return v===void 0&&L(this),v};let E;this.getAttributes=function(){return E===void 0&&L(this),E};let O=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return O===!1&&(O=r.getProgramParameter(S,jp)),O},this.destroy=function(){n.releaseStatesOfProgram(this),r.deleteProgram(S),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Jp++,this.cacheKey=e,this.usedTimes=1,this.program=S,this.vertexShader=P,this.fragmentShader=R,this}let ym=0;class Tm{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,n=e.fragmentShader,r=this._getShaderStage(t),a=this._getShaderStage(n),s=this._getShaderCacheForMaterial(e);return s.has(r)===!1&&(s.add(r),r.usedTimes++),s.has(a)===!1&&(s.add(a),a.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new bm(e),t.set(e,n)),n}}class bm{constructor(e){this.id=ym++,this.code=e,this.usedTimes=0}}function Am(i,e,t,n,r,a){const s=new Ws,o=new Tm,c=new Set,l=[],f=new Map,d=n.logarithmicDepthBuffer;let h=n.precision;const p={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function g(v){return c.add(v),v===0?"uv":`uv${v}`}function S(v,E,O,w,k){const z=w.fog,Y=k.geometry,V=v.isMeshStandardMaterial||v.isMeshLambertMaterial||v.isMeshPhongMaterial?w.environment:null,H=v.isMeshStandardMaterial||v.isMeshLambertMaterial&&!v.envMap||v.isMeshPhongMaterial&&!v.envMap,N=e.get(v.envMap||V,H),te=N&&N.mapping===Or?N.image.height:null,j=p[v.type];v.precision!==null&&(h=n.getMaxPrecision(v.precision),h!==v.precision&&Le("WebGLProgram.getParameters:",v.precision,"not supported, using",h,"instead."));const he=Y.morphAttributes.position||Y.morphAttributes.normal||Y.morphAttributes.color,J=he!==void 0?he.length:0;let ie=0;Y.morphAttributes.position!==void 0&&(ie=1),Y.morphAttributes.normal!==void 0&&(ie=2),Y.morphAttributes.color!==void 0&&(ie=3);let Ae,ke,Ve,X;if(j){const Ze=Kt[j];Ae=Ze.vertexShader,ke=Ze.fragmentShader}else Ae=v.vertexShader,ke=v.fragmentShader,o.update(v),Ve=o.getVertexShaderID(v),X=o.getFragmentShaderID(v);const ne=i.getRenderTarget(),le=i.state.buffers.depth.getReversed(),Ie=k.isInstancedMesh===!0,Re=k.isBatchedMesh===!0,Ce=!!v.map,_t=!!v.matcap,He=!!N,Ke=!!v.aoMap,et=!!v.lightMap,Fe=!!v.bumpMap,lt=!!v.normalMap,C=!!v.displacementMap,dt=!!v.emissiveMap,$e=!!v.metalnessMap,it=!!v.roughnessMap,Se=v.anisotropy>0,y=v.clearcoat>0,_=v.dispersion>0,I=v.iridescence>0,K=v.sheen>0,Z=v.transmission>0,$=Se&&!!v.anisotropyMap,_e=y&&!!v.clearcoatMap,se=y&&!!v.clearcoatNormalMap,be=y&&!!v.clearcoatRoughnessMap,we=I&&!!v.iridescenceMap,Q=I&&!!v.iridescenceThicknessMap,re=K&&!!v.sheenColorMap,ge=K&&!!v.sheenRoughnessMap,xe=!!v.specularMap,fe=!!v.specularColorMap,Oe=!!v.specularIntensityMap,D=Z&&!!v.transmissionMap,oe=Z&&!!v.thicknessMap,ae=!!v.gradientMap,me=!!v.alphaMap,ee=v.alphaTest>0,q=!!v.alphaHash,ve=!!v.extensions;let Pe=Jt;v.toneMapped&&(ne===null||ne.isXRRenderTarget===!0)&&(Pe=i.toneMapping);const rt={shaderID:j,shaderType:v.type,shaderName:v.name,vertexShader:Ae,fragmentShader:ke,defines:v.defines,customVertexShaderID:Ve,customFragmentShaderID:X,isRawShaderMaterial:v.isRawShaderMaterial===!0,glslVersion:v.glslVersion,precision:h,batching:Re,batchingColor:Re&&k._colorsTexture!==null,instancing:Ie,instancingColor:Ie&&k.instanceColor!==null,instancingMorph:Ie&&k.morphTexture!==null,outputColorSpace:ne===null?i.outputColorSpace:ne.isXRRenderTarget===!0?ne.texture.colorSpace:_i,alphaToCoverage:!!v.alphaToCoverage,map:Ce,matcap:_t,envMap:He,envMapMode:He&&N.mapping,envMapCubeUVHeight:te,aoMap:Ke,lightMap:et,bumpMap:Fe,normalMap:lt,displacementMap:C,emissiveMap:dt,normalMapObjectSpace:lt&&v.normalMapType===iu,normalMapTangentSpace:lt&&v.normalMapType===Kl,metalnessMap:$e,roughnessMap:it,anisotropy:Se,anisotropyMap:$,clearcoat:y,clearcoatMap:_e,clearcoatNormalMap:se,clearcoatRoughnessMap:be,dispersion:_,iridescence:I,iridescenceMap:we,iridescenceThicknessMap:Q,sheen:K,sheenColorMap:re,sheenRoughnessMap:ge,specularMap:xe,specularColorMap:fe,specularIntensityMap:Oe,transmission:Z,transmissionMap:D,thicknessMap:oe,gradientMap:ae,opaque:v.transparent===!1&&v.blending===ui&&v.alphaToCoverage===!1,alphaMap:me,alphaTest:ee,alphaHash:q,combine:v.combine,mapUv:Ce&&g(v.map.channel),aoMapUv:Ke&&g(v.aoMap.channel),lightMapUv:et&&g(v.lightMap.channel),bumpMapUv:Fe&&g(v.bumpMap.channel),normalMapUv:lt&&g(v.normalMap.channel),displacementMapUv:C&&g(v.displacementMap.channel),emissiveMapUv:dt&&g(v.emissiveMap.channel),metalnessMapUv:$e&&g(v.metalnessMap.channel),roughnessMapUv:it&&g(v.roughnessMap.channel),anisotropyMapUv:$&&g(v.anisotropyMap.channel),clearcoatMapUv:_e&&g(v.clearcoatMap.channel),clearcoatNormalMapUv:se&&g(v.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:be&&g(v.clearcoatRoughnessMap.channel),iridescenceMapUv:we&&g(v.iridescenceMap.channel),iridescenceThicknessMapUv:Q&&g(v.iridescenceThicknessMap.channel),sheenColorMapUv:re&&g(v.sheenColorMap.channel),sheenRoughnessMapUv:ge&&g(v.sheenRoughnessMap.channel),specularMapUv:xe&&g(v.specularMap.channel),specularColorMapUv:fe&&g(v.specularColorMap.channel),specularIntensityMapUv:Oe&&g(v.specularIntensityMap.channel),transmissionMapUv:D&&g(v.transmissionMap.channel),thicknessMapUv:oe&&g(v.thicknessMap.channel),alphaMapUv:me&&g(v.alphaMap.channel),vertexTangents:!!Y.attributes.tangent&&(lt||Se),vertexColors:v.vertexColors,vertexAlphas:v.vertexColors===!0&&!!Y.attributes.color&&Y.attributes.color.itemSize===4,pointsUvs:k.isPoints===!0&&!!Y.attributes.uv&&(Ce||me),fog:!!z,useFog:v.fog===!0,fogExp2:!!z&&z.isFogExp2,flatShading:v.wireframe===!1&&(v.flatShading===!0||Y.attributes.normal===void 0&&lt===!1&&(v.isMeshLambertMaterial||v.isMeshPhongMaterial||v.isMeshStandardMaterial||v.isMeshPhysicalMaterial)),sizeAttenuation:v.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:le,skinning:k.isSkinnedMesh===!0,morphTargets:Y.morphAttributes.position!==void 0,morphNormals:Y.morphAttributes.normal!==void 0,morphColors:Y.morphAttributes.color!==void 0,morphTargetsCount:J,morphTextureStride:ie,numDirLights:E.directional.length,numPointLights:E.point.length,numSpotLights:E.spot.length,numSpotLightMaps:E.spotLightMap.length,numRectAreaLights:E.rectArea.length,numHemiLights:E.hemi.length,numDirLightShadows:E.directionalShadowMap.length,numPointLightShadows:E.pointShadowMap.length,numSpotLightShadows:E.spotShadowMap.length,numSpotLightShadowsWithMaps:E.numSpotLightShadowsWithMaps,numLightProbes:E.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:v.dithering,shadowMapEnabled:i.shadowMap.enabled&&O.length>0,shadowMapType:i.shadowMap.type,toneMapping:Pe,decodeVideoTexture:Ce&&v.map.isVideoTexture===!0&&Xe.getTransfer(v.map.colorSpace)===je,decodeVideoTextureEmissive:dt&&v.emissiveMap.isVideoTexture===!0&&Xe.getTransfer(v.emissiveMap.colorSpace)===je,premultipliedAlpha:v.premultipliedAlpha,doubleSided:v.side===hn,flipSided:v.side===wt,useDepthPacking:v.depthPacking>=0,depthPacking:v.depthPacking||0,index0AttributeName:v.index0AttributeName,extensionClipCullDistance:ve&&v.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(ve&&v.extensions.multiDraw===!0||Re)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:v.customProgramCacheKey()};return rt.vertexUv1s=c.has(1),rt.vertexUv2s=c.has(2),rt.vertexUv3s=c.has(3),c.clear(),rt}function m(v){const E=[];if(v.shaderID?E.push(v.shaderID):(E.push(v.customVertexShaderID),E.push(v.customFragmentShaderID)),v.defines!==void 0)for(const O in v.defines)E.push(O),E.push(v.defines[O]);return v.isRawShaderMaterial===!1&&(u(E,v),M(E,v),E.push(i.outputColorSpace)),E.push(v.customProgramCacheKey),E.join()}function u(v,E){v.push(E.precision),v.push(E.outputColorSpace),v.push(E.envMapMode),v.push(E.envMapCubeUVHeight),v.push(E.mapUv),v.push(E.alphaMapUv),v.push(E.lightMapUv),v.push(E.aoMapUv),v.push(E.bumpMapUv),v.push(E.normalMapUv),v.push(E.displacementMapUv),v.push(E.emissiveMapUv),v.push(E.metalnessMapUv),v.push(E.roughnessMapUv),v.push(E.anisotropyMapUv),v.push(E.clearcoatMapUv),v.push(E.clearcoatNormalMapUv),v.push(E.clearcoatRoughnessMapUv),v.push(E.iridescenceMapUv),v.push(E.iridescenceThicknessMapUv),v.push(E.sheenColorMapUv),v.push(E.sheenRoughnessMapUv),v.push(E.specularMapUv),v.push(E.specularColorMapUv),v.push(E.specularIntensityMapUv),v.push(E.transmissionMapUv),v.push(E.thicknessMapUv),v.push(E.combine),v.push(E.fogExp2),v.push(E.sizeAttenuation),v.push(E.morphTargetsCount),v.push(E.morphAttributeCount),v.push(E.numDirLights),v.push(E.numPointLights),v.push(E.numSpotLights),v.push(E.numSpotLightMaps),v.push(E.numHemiLights),v.push(E.numRectAreaLights),v.push(E.numDirLightShadows),v.push(E.numPointLightShadows),v.push(E.numSpotLightShadows),v.push(E.numSpotLightShadowsWithMaps),v.push(E.numLightProbes),v.push(E.shadowMapType),v.push(E.toneMapping),v.push(E.numClippingPlanes),v.push(E.numClipIntersection),v.push(E.depthPacking)}function M(v,E){s.disableAll(),E.instancing&&s.enable(0),E.instancingColor&&s.enable(1),E.instancingMorph&&s.enable(2),E.matcap&&s.enable(3),E.envMap&&s.enable(4),E.normalMapObjectSpace&&s.enable(5),E.normalMapTangentSpace&&s.enable(6),E.clearcoat&&s.enable(7),E.iridescence&&s.enable(8),E.alphaTest&&s.enable(9),E.vertexColors&&s.enable(10),E.vertexAlphas&&s.enable(11),E.vertexUv1s&&s.enable(12),E.vertexUv2s&&s.enable(13),E.vertexUv3s&&s.enable(14),E.vertexTangents&&s.enable(15),E.anisotropy&&s.enable(16),E.alphaHash&&s.enable(17),E.batching&&s.enable(18),E.dispersion&&s.enable(19),E.batchingColor&&s.enable(20),E.gradientMap&&s.enable(21),v.push(s.mask),s.disableAll(),E.fog&&s.enable(0),E.useFog&&s.enable(1),E.flatShading&&s.enable(2),E.logarithmicDepthBuffer&&s.enable(3),E.reversedDepthBuffer&&s.enable(4),E.skinning&&s.enable(5),E.morphTargets&&s.enable(6),E.morphNormals&&s.enable(7),E.morphColors&&s.enable(8),E.premultipliedAlpha&&s.enable(9),E.shadowMapEnabled&&s.enable(10),E.doubleSided&&s.enable(11),E.flipSided&&s.enable(12),E.useDepthPacking&&s.enable(13),E.dithering&&s.enable(14),E.transmission&&s.enable(15),E.sheen&&s.enable(16),E.opaque&&s.enable(17),E.pointsUvs&&s.enable(18),E.decodeVideoTexture&&s.enable(19),E.decodeVideoTextureEmissive&&s.enable(20),E.alphaToCoverage&&s.enable(21),v.push(s.mask)}function b(v){const E=p[v.type];let O;if(E){const w=Kt[E];O=Vu.clone(w.uniforms)}else O=v.uniforms;return O}function T(v,E){let O=f.get(E);return O!==void 0?++O.usedTimes:(O=new Em(i,E,v,r),l.push(O),f.set(E,O)),O}function P(v){if(--v.usedTimes===0){const E=l.indexOf(v);l[E]=l[l.length-1],l.pop(),f.delete(v.cacheKey),v.destroy()}}function R(v){o.remove(v)}function L(){o.dispose()}return{getParameters:S,getProgramCacheKey:m,getUniforms:b,acquireProgram:T,releaseProgram:P,releaseShaderCache:R,programs:l,dispose:L}}function Rm(){let i=new WeakMap;function e(s){return i.has(s)}function t(s){let o=i.get(s);return o===void 0&&(o={},i.set(s,o)),o}function n(s){i.delete(s)}function r(s,o,c){i.get(s)[o]=c}function a(){i=new WeakMap}return{has:e,get:t,remove:n,update:r,dispose:a}}function wm(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.materialVariant!==e.materialVariant?i.materialVariant-e.materialVariant:i.z!==e.z?i.z-e.z:i.id-e.id}function ml(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function _l(){const i=[];let e=0;const t=[],n=[],r=[];function a(){e=0,t.length=0,n.length=0,r.length=0}function s(h){let p=0;return h.isInstancedMesh&&(p+=2),h.isSkinnedMesh&&(p+=1),p}function o(h,p,g,S,m,u){let M=i[e];return M===void 0?(M={id:h.id,object:h,geometry:p,material:g,materialVariant:s(h),groupOrder:S,renderOrder:h.renderOrder,z:m,group:u},i[e]=M):(M.id=h.id,M.object=h,M.geometry=p,M.material=g,M.materialVariant=s(h),M.groupOrder=S,M.renderOrder=h.renderOrder,M.z=m,M.group=u),e++,M}function c(h,p,g,S,m,u){const M=o(h,p,g,S,m,u);g.transmission>0?n.push(M):g.transparent===!0?r.push(M):t.push(M)}function l(h,p,g,S,m,u){const M=o(h,p,g,S,m,u);g.transmission>0?n.unshift(M):g.transparent===!0?r.unshift(M):t.unshift(M)}function f(h,p){t.length>1&&t.sort(h||wm),n.length>1&&n.sort(p||ml),r.length>1&&r.sort(p||ml)}function d(){for(let h=e,p=i.length;h<p;h++){const g=i[h];if(g.id===null)break;g.id=null,g.object=null,g.geometry=null,g.material=null,g.group=null}}return{opaque:t,transmissive:n,transparent:r,init:a,push:c,unshift:l,finish:d,sort:f}}function Cm(){let i=new WeakMap;function e(n,r){const a=i.get(n);let s;return a===void 0?(s=new _l,i.set(n,[s])):r>=a.length?(s=new _l,a.push(s)):s=a[r],s}function t(){i=new WeakMap}return{get:e,dispose:t}}function Pm(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new B,color:new Ge};break;case"SpotLight":t={position:new B,direction:new B,color:new Ge,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new B,color:new Ge,distance:0,decay:0};break;case"HemisphereLight":t={direction:new B,skyColor:new Ge,groundColor:new Ge};break;case"RectAreaLight":t={color:new Ge,position:new B,halfWidth:new B,halfHeight:new B};break}return i[e.id]=t,t}}}function Lm(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ye};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ye};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ye,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let Dm=0;function Im(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function Um(i){const e=new Pm,t=Lm(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)n.probe.push(new B);const r=new B,a=new at,s=new at;function o(l){let f=0,d=0,h=0;for(let E=0;E<9;E++)n.probe[E].set(0,0,0);let p=0,g=0,S=0,m=0,u=0,M=0,b=0,T=0,P=0,R=0,L=0;l.sort(Im);for(let E=0,O=l.length;E<O;E++){const w=l[E],k=w.color,z=w.intensity,Y=w.distance;let V=null;if(w.shadow&&w.shadow.map&&(w.shadow.map.texture.format===mi?V=w.shadow.map.texture:V=w.shadow.map.depthTexture||w.shadow.map.texture),w.isAmbientLight)f+=k.r*z,d+=k.g*z,h+=k.b*z;else if(w.isLightProbe){for(let H=0;H<9;H++)n.probe[H].addScaledVector(w.sh.coefficients[H],z);L++}else if(w.isDirectionalLight){const H=e.get(w);if(H.color.copy(w.color).multiplyScalar(w.intensity),w.castShadow){const N=w.shadow,te=t.get(w);te.shadowIntensity=N.intensity,te.shadowBias=N.bias,te.shadowNormalBias=N.normalBias,te.shadowRadius=N.radius,te.shadowMapSize=N.mapSize,n.directionalShadow[p]=te,n.directionalShadowMap[p]=V,n.directionalShadowMatrix[p]=w.shadow.matrix,M++}n.directional[p]=H,p++}else if(w.isSpotLight){const H=e.get(w);H.position.setFromMatrixPosition(w.matrixWorld),H.color.copy(k).multiplyScalar(z),H.distance=Y,H.coneCos=Math.cos(w.angle),H.penumbraCos=Math.cos(w.angle*(1-w.penumbra)),H.decay=w.decay,n.spot[S]=H;const N=w.shadow;if(w.map&&(n.spotLightMap[P]=w.map,P++,N.updateMatrices(w),w.castShadow&&R++),n.spotLightMatrix[S]=N.matrix,w.castShadow){const te=t.get(w);te.shadowIntensity=N.intensity,te.shadowBias=N.bias,te.shadowNormalBias=N.normalBias,te.shadowRadius=N.radius,te.shadowMapSize=N.mapSize,n.spotShadow[S]=te,n.spotShadowMap[S]=V,T++}S++}else if(w.isRectAreaLight){const H=e.get(w);H.color.copy(k).multiplyScalar(z),H.halfWidth.set(w.width*.5,0,0),H.halfHeight.set(0,w.height*.5,0),n.rectArea[m]=H,m++}else if(w.isPointLight){const H=e.get(w);if(H.color.copy(w.color).multiplyScalar(w.intensity),H.distance=w.distance,H.decay=w.decay,w.castShadow){const N=w.shadow,te=t.get(w);te.shadowIntensity=N.intensity,te.shadowBias=N.bias,te.shadowNormalBias=N.normalBias,te.shadowRadius=N.radius,te.shadowMapSize=N.mapSize,te.shadowCameraNear=N.camera.near,te.shadowCameraFar=N.camera.far,n.pointShadow[g]=te,n.pointShadowMap[g]=V,n.pointShadowMatrix[g]=w.shadow.matrix,b++}n.point[g]=H,g++}else if(w.isHemisphereLight){const H=e.get(w);H.skyColor.copy(w.color).multiplyScalar(z),H.groundColor.copy(w.groundColor).multiplyScalar(z),n.hemi[u]=H,u++}}m>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=ce.LTC_FLOAT_1,n.rectAreaLTC2=ce.LTC_FLOAT_2):(n.rectAreaLTC1=ce.LTC_HALF_1,n.rectAreaLTC2=ce.LTC_HALF_2)),n.ambient[0]=f,n.ambient[1]=d,n.ambient[2]=h;const v=n.hash;(v.directionalLength!==p||v.pointLength!==g||v.spotLength!==S||v.rectAreaLength!==m||v.hemiLength!==u||v.numDirectionalShadows!==M||v.numPointShadows!==b||v.numSpotShadows!==T||v.numSpotMaps!==P||v.numLightProbes!==L)&&(n.directional.length=p,n.spot.length=S,n.rectArea.length=m,n.point.length=g,n.hemi.length=u,n.directionalShadow.length=M,n.directionalShadowMap.length=M,n.pointShadow.length=b,n.pointShadowMap.length=b,n.spotShadow.length=T,n.spotShadowMap.length=T,n.directionalShadowMatrix.length=M,n.pointShadowMatrix.length=b,n.spotLightMatrix.length=T+P-R,n.spotLightMap.length=P,n.numSpotLightShadowsWithMaps=R,n.numLightProbes=L,v.directionalLength=p,v.pointLength=g,v.spotLength=S,v.rectAreaLength=m,v.hemiLength=u,v.numDirectionalShadows=M,v.numPointShadows=b,v.numSpotShadows=T,v.numSpotMaps=P,v.numLightProbes=L,n.version=Dm++)}function c(l,f){let d=0,h=0,p=0,g=0,S=0;const m=f.matrixWorldInverse;for(let u=0,M=l.length;u<M;u++){const b=l[u];if(b.isDirectionalLight){const T=n.directional[d];T.direction.setFromMatrixPosition(b.matrixWorld),r.setFromMatrixPosition(b.target.matrixWorld),T.direction.sub(r),T.direction.transformDirection(m),d++}else if(b.isSpotLight){const T=n.spot[p];T.position.setFromMatrixPosition(b.matrixWorld),T.position.applyMatrix4(m),T.direction.setFromMatrixPosition(b.matrixWorld),r.setFromMatrixPosition(b.target.matrixWorld),T.direction.sub(r),T.direction.transformDirection(m),p++}else if(b.isRectAreaLight){const T=n.rectArea[g];T.position.setFromMatrixPosition(b.matrixWorld),T.position.applyMatrix4(m),s.identity(),a.copy(b.matrixWorld),a.premultiply(m),s.extractRotation(a),T.halfWidth.set(b.width*.5,0,0),T.halfHeight.set(0,b.height*.5,0),T.halfWidth.applyMatrix4(s),T.halfHeight.applyMatrix4(s),g++}else if(b.isPointLight){const T=n.point[h];T.position.setFromMatrixPosition(b.matrixWorld),T.position.applyMatrix4(m),h++}else if(b.isHemisphereLight){const T=n.hemi[S];T.direction.setFromMatrixPosition(b.matrixWorld),T.direction.transformDirection(m),S++}}}return{setup:o,setupView:c,state:n}}function gl(i){const e=new Um(i),t=[],n=[];function r(f){l.camera=f,t.length=0,n.length=0}function a(f){t.push(f)}function s(f){n.push(f)}function o(){e.setup(t)}function c(f){e.setupView(t,f)}const l={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:r,state:l,setupLights:o,setupLightsView:c,pushLight:a,pushShadow:s}}function Nm(i){let e=new WeakMap;function t(r,a=0){const s=e.get(r);let o;return s===void 0?(o=new gl(i),e.set(r,[o])):a>=s.length?(o=new gl(i),s.push(o)):o=s[a],o}function n(){e=new WeakMap}return{get:t,dispose:n}}const Fm=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Om=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,Bm=[new B(1,0,0),new B(-1,0,0),new B(0,1,0),new B(0,-1,0),new B(0,0,1),new B(0,0,-1)],zm=[new B(0,-1,0),new B(0,-1,0),new B(0,0,1),new B(0,0,-1),new B(0,-1,0),new B(0,-1,0)],vl=new at,wi=new B,ba=new B;function Gm(i,e,t){let n=new qs;const r=new Ye,a=new Ye,s=new ot,o=new qu,c=new Yu,l={},f=t.maxTextureSize,d={[Pn]:wt,[wt]:Pn,[hn]:hn},h=new rn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Ye},radius:{value:4}},vertexShader:Fm,fragmentShader:Om}),p=h.clone();p.defines.HORIZONTAL_PASS=1;const g=new zt;g.setAttribute("position",new en(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const S=new Bt(g,h),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Sr;let u=this.type;this.render=function(R,L,v){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||R.length===0)return;this.type===Uc&&(Le("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=Sr);const E=i.getRenderTarget(),O=i.getActiveCubeFace(),w=i.getActiveMipmapLevel(),k=i.state;k.setBlending(mn),k.buffers.depth.getReversed()===!0?k.buffers.color.setClear(0,0,0,0):k.buffers.color.setClear(1,1,1,1),k.buffers.depth.setTest(!0),k.setScissorTest(!1);const z=u!==this.type;z&&L.traverse(function(Y){Y.material&&(Array.isArray(Y.material)?Y.material.forEach(V=>V.needsUpdate=!0):Y.material.needsUpdate=!0)});for(let Y=0,V=R.length;Y<V;Y++){const H=R[Y],N=H.shadow;if(N===void 0){Le("WebGLShadowMap:",H,"has no shadow.");continue}if(N.autoUpdate===!1&&N.needsUpdate===!1)continue;r.copy(N.mapSize);const te=N.getFrameExtents();r.multiply(te),a.copy(N.mapSize),(r.x>f||r.y>f)&&(r.x>f&&(a.x=Math.floor(f/te.x),r.x=a.x*te.x,N.mapSize.x=a.x),r.y>f&&(a.y=Math.floor(f/te.y),r.y=a.y*te.y,N.mapSize.y=a.y));const j=i.state.buffers.depth.getReversed();if(N.camera._reversedDepth=j,N.map===null||z===!0){if(N.map!==null&&(N.map.depthTexture!==null&&(N.map.depthTexture.dispose(),N.map.depthTexture=null),N.map.dispose()),this.type===Ci){if(H.isPointLight){Le("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}N.map=new Qt(r.x,r.y,{format:mi,type:gn,minFilter:bt,magFilter:bt,generateMipmaps:!1}),N.map.texture.name=H.name+".shadowMap",N.map.depthTexture=new zi(r.x,r.y,Zt),N.map.depthTexture.name=H.name+".shadowMapDepth",N.map.depthTexture.format=vn,N.map.depthTexture.compareFunction=null,N.map.depthTexture.minFilter=Mt,N.map.depthTexture.magFilter=Mt}else H.isPointLight?(N.map=new lc(r.x),N.map.depthTexture=new zu(r.x,tn)):(N.map=new Qt(r.x,r.y),N.map.depthTexture=new zi(r.x,r.y,tn)),N.map.depthTexture.name=H.name+".shadowMap",N.map.depthTexture.format=vn,this.type===Sr?(N.map.depthTexture.compareFunction=j?ks:Vs,N.map.depthTexture.minFilter=bt,N.map.depthTexture.magFilter=bt):(N.map.depthTexture.compareFunction=null,N.map.depthTexture.minFilter=Mt,N.map.depthTexture.magFilter=Mt);N.camera.updateProjectionMatrix()}const he=N.map.isWebGLCubeRenderTarget?6:1;for(let J=0;J<he;J++){if(N.map.isWebGLCubeRenderTarget)i.setRenderTarget(N.map,J),i.clear();else{J===0&&(i.setRenderTarget(N.map),i.clear());const ie=N.getViewport(J);s.set(a.x*ie.x,a.y*ie.y,a.x*ie.z,a.y*ie.w),k.viewport(s)}if(H.isPointLight){const ie=N.camera,Ae=N.matrix,ke=H.distance||ie.far;ke!==ie.far&&(ie.far=ke,ie.updateProjectionMatrix()),wi.setFromMatrixPosition(H.matrixWorld),ie.position.copy(wi),ba.copy(ie.position),ba.add(Bm[J]),ie.up.copy(zm[J]),ie.lookAt(ba),ie.updateMatrixWorld(),Ae.makeTranslation(-wi.x,-wi.y,-wi.z),vl.multiplyMatrices(ie.projectionMatrix,ie.matrixWorldInverse),N._frustum.setFromProjectionMatrix(vl,ie.coordinateSystem,ie.reversedDepth)}else N.updateMatrices(H);n=N.getFrustum(),T(L,v,N.camera,H,this.type)}N.isPointLightShadow!==!0&&this.type===Ci&&M(N,v),N.needsUpdate=!1}u=this.type,m.needsUpdate=!1,i.setRenderTarget(E,O,w)};function M(R,L){const v=e.update(S);h.defines.VSM_SAMPLES!==R.blurSamples&&(h.defines.VSM_SAMPLES=R.blurSamples,p.defines.VSM_SAMPLES=R.blurSamples,h.needsUpdate=!0,p.needsUpdate=!0),R.mapPass===null&&(R.mapPass=new Qt(r.x,r.y,{format:mi,type:gn})),h.uniforms.shadow_pass.value=R.map.depthTexture,h.uniforms.resolution.value=R.mapSize,h.uniforms.radius.value=R.radius,i.setRenderTarget(R.mapPass),i.clear(),i.renderBufferDirect(L,null,v,h,S,null),p.uniforms.shadow_pass.value=R.mapPass.texture,p.uniforms.resolution.value=R.mapSize,p.uniforms.radius.value=R.radius,i.setRenderTarget(R.map),i.clear(),i.renderBufferDirect(L,null,v,p,S,null)}function b(R,L,v,E){let O=null;const w=v.isPointLight===!0?R.customDistanceMaterial:R.customDepthMaterial;if(w!==void 0)O=w;else if(O=v.isPointLight===!0?c:o,i.localClippingEnabled&&L.clipShadows===!0&&Array.isArray(L.clippingPlanes)&&L.clippingPlanes.length!==0||L.displacementMap&&L.displacementScale!==0||L.alphaMap&&L.alphaTest>0||L.map&&L.alphaTest>0||L.alphaToCoverage===!0){const k=O.uuid,z=L.uuid;let Y=l[k];Y===void 0&&(Y={},l[k]=Y);let V=Y[z];V===void 0&&(V=O.clone(),Y[z]=V,L.addEventListener("dispose",P)),O=V}if(O.visible=L.visible,O.wireframe=L.wireframe,E===Ci?O.side=L.shadowSide!==null?L.shadowSide:L.side:O.side=L.shadowSide!==null?L.shadowSide:d[L.side],O.alphaMap=L.alphaMap,O.alphaTest=L.alphaToCoverage===!0?.5:L.alphaTest,O.map=L.map,O.clipShadows=L.clipShadows,O.clippingPlanes=L.clippingPlanes,O.clipIntersection=L.clipIntersection,O.displacementMap=L.displacementMap,O.displacementScale=L.displacementScale,O.displacementBias=L.displacementBias,O.wireframeLinewidth=L.wireframeLinewidth,O.linewidth=L.linewidth,v.isPointLight===!0&&O.isMeshDistanceMaterial===!0){const k=i.properties.get(O);k.light=v}return O}function T(R,L,v,E,O){if(R.visible===!1)return;if(R.layers.test(L.layers)&&(R.isMesh||R.isLine||R.isPoints)&&(R.castShadow||R.receiveShadow&&O===Ci)&&(!R.frustumCulled||n.intersectsObject(R))){R.modelViewMatrix.multiplyMatrices(v.matrixWorldInverse,R.matrixWorld);const z=e.update(R),Y=R.material;if(Array.isArray(Y)){const V=z.groups;for(let H=0,N=V.length;H<N;H++){const te=V[H],j=Y[te.materialIndex];if(j&&j.visible){const he=b(R,j,E,O);R.onBeforeShadow(i,R,L,v,z,he,te),i.renderBufferDirect(v,null,z,he,R,te),R.onAfterShadow(i,R,L,v,z,he,te)}}}else if(Y.visible){const V=b(R,Y,E,O);R.onBeforeShadow(i,R,L,v,z,V,null),i.renderBufferDirect(v,null,z,V,R,null),R.onAfterShadow(i,R,L,v,z,V,null)}}const k=R.children;for(let z=0,Y=k.length;z<Y;z++)T(k[z],L,v,E,O)}function P(R){R.target.removeEventListener("dispose",P);for(const v in l){const E=l[v],O=R.target.uuid;O in E&&(E[O].dispose(),delete E[O])}}}function Vm(i,e){function t(){let D=!1;const oe=new ot;let ae=null;const me=new ot(0,0,0,0);return{setMask:function(ee){ae!==ee&&!D&&(i.colorMask(ee,ee,ee,ee),ae=ee)},setLocked:function(ee){D=ee},setClear:function(ee,q,ve,Pe,rt){rt===!0&&(ee*=Pe,q*=Pe,ve*=Pe),oe.set(ee,q,ve,Pe),me.equals(oe)===!1&&(i.clearColor(ee,q,ve,Pe),me.copy(oe))},reset:function(){D=!1,ae=null,me.set(-1,0,0,0)}}}function n(){let D=!1,oe=!1,ae=null,me=null,ee=null;return{setReversed:function(q){if(oe!==q){const ve=e.get("EXT_clip_control");q?ve.clipControlEXT(ve.LOWER_LEFT_EXT,ve.ZERO_TO_ONE_EXT):ve.clipControlEXT(ve.LOWER_LEFT_EXT,ve.NEGATIVE_ONE_TO_ONE_EXT),oe=q;const Pe=ee;ee=null,this.setClear(Pe)}},getReversed:function(){return oe},setTest:function(q){q?ne(i.DEPTH_TEST):le(i.DEPTH_TEST)},setMask:function(q){ae!==q&&!D&&(i.depthMask(q),ae=q)},setFunc:function(q){if(oe&&(q=fu[q]),me!==q){switch(q){case Ia:i.depthFunc(i.NEVER);break;case Ua:i.depthFunc(i.ALWAYS);break;case Na:i.depthFunc(i.LESS);break;case fi:i.depthFunc(i.LEQUAL);break;case Fa:i.depthFunc(i.EQUAL);break;case Oa:i.depthFunc(i.GEQUAL);break;case Ba:i.depthFunc(i.GREATER);break;case za:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}me=q}},setLocked:function(q){D=q},setClear:function(q){ee!==q&&(ee=q,oe&&(q=1-q),i.clearDepth(q))},reset:function(){D=!1,ae=null,me=null,ee=null,oe=!1}}}function r(){let D=!1,oe=null,ae=null,me=null,ee=null,q=null,ve=null,Pe=null,rt=null;return{setTest:function(Ze){D||(Ze?ne(i.STENCIL_TEST):le(i.STENCIL_TEST))},setMask:function(Ze){oe!==Ze&&!D&&(i.stencilMask(Ze),oe=Ze)},setFunc:function(Ze,an,sn){(ae!==Ze||me!==an||ee!==sn)&&(i.stencilFunc(Ze,an,sn),ae=Ze,me=an,ee=sn)},setOp:function(Ze,an,sn){(q!==Ze||ve!==an||Pe!==sn)&&(i.stencilOp(Ze,an,sn),q=Ze,ve=an,Pe=sn)},setLocked:function(Ze){D=Ze},setClear:function(Ze){rt!==Ze&&(i.clearStencil(Ze),rt=Ze)},reset:function(){D=!1,oe=null,ae=null,me=null,ee=null,q=null,ve=null,Pe=null,rt=null}}}const a=new t,s=new n,o=new r,c=new WeakMap,l=new WeakMap;let f={},d={},h=new WeakMap,p=[],g=null,S=!1,m=null,u=null,M=null,b=null,T=null,P=null,R=null,L=new Ge(0,0,0),v=0,E=!1,O=null,w=null,k=null,z=null,Y=null;const V=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let H=!1,N=0;const te=i.getParameter(i.VERSION);te.indexOf("WebGL")!==-1?(N=parseFloat(/^WebGL (\d)/.exec(te)[1]),H=N>=1):te.indexOf("OpenGL ES")!==-1&&(N=parseFloat(/^OpenGL ES (\d)/.exec(te)[1]),H=N>=2);let j=null,he={};const J=i.getParameter(i.SCISSOR_BOX),ie=i.getParameter(i.VIEWPORT),Ae=new ot().fromArray(J),ke=new ot().fromArray(ie);function Ve(D,oe,ae,me){const ee=new Uint8Array(4),q=i.createTexture();i.bindTexture(D,q),i.texParameteri(D,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(D,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let ve=0;ve<ae;ve++)D===i.TEXTURE_3D||D===i.TEXTURE_2D_ARRAY?i.texImage3D(oe,0,i.RGBA,1,1,me,0,i.RGBA,i.UNSIGNED_BYTE,ee):i.texImage2D(oe+ve,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,ee);return q}const X={};X[i.TEXTURE_2D]=Ve(i.TEXTURE_2D,i.TEXTURE_2D,1),X[i.TEXTURE_CUBE_MAP]=Ve(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),X[i.TEXTURE_2D_ARRAY]=Ve(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),X[i.TEXTURE_3D]=Ve(i.TEXTURE_3D,i.TEXTURE_3D,1,1),a.setClear(0,0,0,1),s.setClear(1),o.setClear(0),ne(i.DEPTH_TEST),s.setFunc(fi),Fe(!1),lt(go),ne(i.CULL_FACE),Ke(mn);function ne(D){f[D]!==!0&&(i.enable(D),f[D]=!0)}function le(D){f[D]!==!1&&(i.disable(D),f[D]=!1)}function Ie(D,oe){return d[D]!==oe?(i.bindFramebuffer(D,oe),d[D]=oe,D===i.DRAW_FRAMEBUFFER&&(d[i.FRAMEBUFFER]=oe),D===i.FRAMEBUFFER&&(d[i.DRAW_FRAMEBUFFER]=oe),!0):!1}function Re(D,oe){let ae=p,me=!1;if(D){ae=h.get(oe),ae===void 0&&(ae=[],h.set(oe,ae));const ee=D.textures;if(ae.length!==ee.length||ae[0]!==i.COLOR_ATTACHMENT0){for(let q=0,ve=ee.length;q<ve;q++)ae[q]=i.COLOR_ATTACHMENT0+q;ae.length=ee.length,me=!0}}else ae[0]!==i.BACK&&(ae[0]=i.BACK,me=!0);me&&i.drawBuffers(ae)}function Ce(D){return g!==D?(i.useProgram(D),g=D,!0):!1}const _t={[Gn]:i.FUNC_ADD,[Fc]:i.FUNC_SUBTRACT,[Oc]:i.FUNC_REVERSE_SUBTRACT};_t[Bc]=i.MIN,_t[zc]=i.MAX;const He={[Gc]:i.ZERO,[Vc]:i.ONE,[kc]:i.SRC_COLOR,[La]:i.SRC_ALPHA,[$c]:i.SRC_ALPHA_SATURATE,[qc]:i.DST_COLOR,[Wc]:i.DST_ALPHA,[Hc]:i.ONE_MINUS_SRC_COLOR,[Da]:i.ONE_MINUS_SRC_ALPHA,[Yc]:i.ONE_MINUS_DST_COLOR,[Xc]:i.ONE_MINUS_DST_ALPHA,[Kc]:i.CONSTANT_COLOR,[Zc]:i.ONE_MINUS_CONSTANT_COLOR,[jc]:i.CONSTANT_ALPHA,[Jc]:i.ONE_MINUS_CONSTANT_ALPHA};function Ke(D,oe,ae,me,ee,q,ve,Pe,rt,Ze){if(D===mn){S===!0&&(le(i.BLEND),S=!1);return}if(S===!1&&(ne(i.BLEND),S=!0),D!==Nc){if(D!==m||Ze!==E){if((u!==Gn||T!==Gn)&&(i.blendEquation(i.FUNC_ADD),u=Gn,T=Gn),Ze)switch(D){case ui:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case vo:i.blendFunc(i.ONE,i.ONE);break;case xo:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Mo:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:We("WebGLState: Invalid blending: ",D);break}else switch(D){case ui:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case vo:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case xo:We("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Mo:We("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:We("WebGLState: Invalid blending: ",D);break}M=null,b=null,P=null,R=null,L.set(0,0,0),v=0,m=D,E=Ze}return}ee=ee||oe,q=q||ae,ve=ve||me,(oe!==u||ee!==T)&&(i.blendEquationSeparate(_t[oe],_t[ee]),u=oe,T=ee),(ae!==M||me!==b||q!==P||ve!==R)&&(i.blendFuncSeparate(He[ae],He[me],He[q],He[ve]),M=ae,b=me,P=q,R=ve),(Pe.equals(L)===!1||rt!==v)&&(i.blendColor(Pe.r,Pe.g,Pe.b,rt),L.copy(Pe),v=rt),m=D,E=!1}function et(D,oe){D.side===hn?le(i.CULL_FACE):ne(i.CULL_FACE);let ae=D.side===wt;oe&&(ae=!ae),Fe(ae),D.blending===ui&&D.transparent===!1?Ke(mn):Ke(D.blending,D.blendEquation,D.blendSrc,D.blendDst,D.blendEquationAlpha,D.blendSrcAlpha,D.blendDstAlpha,D.blendColor,D.blendAlpha,D.premultipliedAlpha),s.setFunc(D.depthFunc),s.setTest(D.depthTest),s.setMask(D.depthWrite),a.setMask(D.colorWrite);const me=D.stencilWrite;o.setTest(me),me&&(o.setMask(D.stencilWriteMask),o.setFunc(D.stencilFunc,D.stencilRef,D.stencilFuncMask),o.setOp(D.stencilFail,D.stencilZFail,D.stencilZPass)),dt(D.polygonOffset,D.polygonOffsetFactor,D.polygonOffsetUnits),D.alphaToCoverage===!0?ne(i.SAMPLE_ALPHA_TO_COVERAGE):le(i.SAMPLE_ALPHA_TO_COVERAGE)}function Fe(D){O!==D&&(D?i.frontFace(i.CW):i.frontFace(i.CCW),O=D)}function lt(D){D!==Dc?(ne(i.CULL_FACE),D!==w&&(D===go?i.cullFace(i.BACK):D===Ic?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):le(i.CULL_FACE),w=D}function C(D){D!==k&&(H&&i.lineWidth(D),k=D)}function dt(D,oe,ae){D?(ne(i.POLYGON_OFFSET_FILL),(z!==oe||Y!==ae)&&(z=oe,Y=ae,s.getReversed()&&(oe=-oe),i.polygonOffset(oe,ae))):le(i.POLYGON_OFFSET_FILL)}function $e(D){D?ne(i.SCISSOR_TEST):le(i.SCISSOR_TEST)}function it(D){D===void 0&&(D=i.TEXTURE0+V-1),j!==D&&(i.activeTexture(D),j=D)}function Se(D,oe,ae){ae===void 0&&(j===null?ae=i.TEXTURE0+V-1:ae=j);let me=he[ae];me===void 0&&(me={type:void 0,texture:void 0},he[ae]=me),(me.type!==D||me.texture!==oe)&&(j!==ae&&(i.activeTexture(ae),j=ae),i.bindTexture(D,oe||X[D]),me.type=D,me.texture=oe)}function y(){const D=he[j];D!==void 0&&D.type!==void 0&&(i.bindTexture(D.type,null),D.type=void 0,D.texture=void 0)}function _(){try{i.compressedTexImage2D(...arguments)}catch(D){We("WebGLState:",D)}}function I(){try{i.compressedTexImage3D(...arguments)}catch(D){We("WebGLState:",D)}}function K(){try{i.texSubImage2D(...arguments)}catch(D){We("WebGLState:",D)}}function Z(){try{i.texSubImage3D(...arguments)}catch(D){We("WebGLState:",D)}}function $(){try{i.compressedTexSubImage2D(...arguments)}catch(D){We("WebGLState:",D)}}function _e(){try{i.compressedTexSubImage3D(...arguments)}catch(D){We("WebGLState:",D)}}function se(){try{i.texStorage2D(...arguments)}catch(D){We("WebGLState:",D)}}function be(){try{i.texStorage3D(...arguments)}catch(D){We("WebGLState:",D)}}function we(){try{i.texImage2D(...arguments)}catch(D){We("WebGLState:",D)}}function Q(){try{i.texImage3D(...arguments)}catch(D){We("WebGLState:",D)}}function re(D){Ae.equals(D)===!1&&(i.scissor(D.x,D.y,D.z,D.w),Ae.copy(D))}function ge(D){ke.equals(D)===!1&&(i.viewport(D.x,D.y,D.z,D.w),ke.copy(D))}function xe(D,oe){let ae=l.get(oe);ae===void 0&&(ae=new WeakMap,l.set(oe,ae));let me=ae.get(D);me===void 0&&(me=i.getUniformBlockIndex(oe,D.name),ae.set(D,me))}function fe(D,oe){const me=l.get(oe).get(D);c.get(oe)!==me&&(i.uniformBlockBinding(oe,me,D.__bindingPointIndex),c.set(oe,me))}function Oe(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),s.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),f={},j=null,he={},d={},h=new WeakMap,p=[],g=null,S=!1,m=null,u=null,M=null,b=null,T=null,P=null,R=null,L=new Ge(0,0,0),v=0,E=!1,O=null,w=null,k=null,z=null,Y=null,Ae.set(0,0,i.canvas.width,i.canvas.height),ke.set(0,0,i.canvas.width,i.canvas.height),a.reset(),s.reset(),o.reset()}return{buffers:{color:a,depth:s,stencil:o},enable:ne,disable:le,bindFramebuffer:Ie,drawBuffers:Re,useProgram:Ce,setBlending:Ke,setMaterial:et,setFlipSided:Fe,setCullFace:lt,setLineWidth:C,setPolygonOffset:dt,setScissorTest:$e,activeTexture:it,bindTexture:Se,unbindTexture:y,compressedTexImage2D:_,compressedTexImage3D:I,texImage2D:we,texImage3D:Q,updateUBOMapping:xe,uniformBlockBinding:fe,texStorage2D:se,texStorage3D:be,texSubImage2D:K,texSubImage3D:Z,compressedTexSubImage2D:$,compressedTexSubImage3D:_e,scissor:re,viewport:ge,reset:Oe}}function km(i,e,t,n,r,a,s){const o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new Ye,f=new WeakMap;let d;const h=new WeakMap;let p=!1;try{p=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(y,_){return p?new OffscreenCanvas(y,_):Bi("canvas")}function S(y,_,I){let K=1;const Z=Se(y);if((Z.width>I||Z.height>I)&&(K=I/Math.max(Z.width,Z.height)),K<1)if(typeof HTMLImageElement<"u"&&y instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&y instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&y instanceof ImageBitmap||typeof VideoFrame<"u"&&y instanceof VideoFrame){const $=Math.floor(K*Z.width),_e=Math.floor(K*Z.height);d===void 0&&(d=g($,_e));const se=_?g($,_e):d;return se.width=$,se.height=_e,se.getContext("2d").drawImage(y,0,0,$,_e),Le("WebGLRenderer: Texture has been resized from ("+Z.width+"x"+Z.height+") to ("+$+"x"+_e+")."),se}else return"data"in y&&Le("WebGLRenderer: Image in DataTexture is too big ("+Z.width+"x"+Z.height+")."),y;return y}function m(y){return y.generateMipmaps}function u(y){i.generateMipmap(y)}function M(y){return y.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:y.isWebGL3DRenderTarget?i.TEXTURE_3D:y.isWebGLArrayRenderTarget||y.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function b(y,_,I,K,Z=!1){if(y!==null){if(i[y]!==void 0)return i[y];Le("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+y+"'")}let $=_;if(_===i.RED&&(I===i.FLOAT&&($=i.R32F),I===i.HALF_FLOAT&&($=i.R16F),I===i.UNSIGNED_BYTE&&($=i.R8)),_===i.RED_INTEGER&&(I===i.UNSIGNED_BYTE&&($=i.R8UI),I===i.UNSIGNED_SHORT&&($=i.R16UI),I===i.UNSIGNED_INT&&($=i.R32UI),I===i.BYTE&&($=i.R8I),I===i.SHORT&&($=i.R16I),I===i.INT&&($=i.R32I)),_===i.RG&&(I===i.FLOAT&&($=i.RG32F),I===i.HALF_FLOAT&&($=i.RG16F),I===i.UNSIGNED_BYTE&&($=i.RG8)),_===i.RG_INTEGER&&(I===i.UNSIGNED_BYTE&&($=i.RG8UI),I===i.UNSIGNED_SHORT&&($=i.RG16UI),I===i.UNSIGNED_INT&&($=i.RG32UI),I===i.BYTE&&($=i.RG8I),I===i.SHORT&&($=i.RG16I),I===i.INT&&($=i.RG32I)),_===i.RGB_INTEGER&&(I===i.UNSIGNED_BYTE&&($=i.RGB8UI),I===i.UNSIGNED_SHORT&&($=i.RGB16UI),I===i.UNSIGNED_INT&&($=i.RGB32UI),I===i.BYTE&&($=i.RGB8I),I===i.SHORT&&($=i.RGB16I),I===i.INT&&($=i.RGB32I)),_===i.RGBA_INTEGER&&(I===i.UNSIGNED_BYTE&&($=i.RGBA8UI),I===i.UNSIGNED_SHORT&&($=i.RGBA16UI),I===i.UNSIGNED_INT&&($=i.RGBA32UI),I===i.BYTE&&($=i.RGBA8I),I===i.SHORT&&($=i.RGBA16I),I===i.INT&&($=i.RGBA32I)),_===i.RGB&&(I===i.UNSIGNED_INT_5_9_9_9_REV&&($=i.RGB9_E5),I===i.UNSIGNED_INT_10F_11F_11F_REV&&($=i.R11F_G11F_B10F)),_===i.RGBA){const _e=Z?Lr:Xe.getTransfer(K);I===i.FLOAT&&($=i.RGBA32F),I===i.HALF_FLOAT&&($=i.RGBA16F),I===i.UNSIGNED_BYTE&&($=_e===je?i.SRGB8_ALPHA8:i.RGBA8),I===i.UNSIGNED_SHORT_4_4_4_4&&($=i.RGBA4),I===i.UNSIGNED_SHORT_5_5_5_1&&($=i.RGB5_A1)}return($===i.R16F||$===i.R32F||$===i.RG16F||$===i.RG32F||$===i.RGBA16F||$===i.RGBA32F)&&e.get("EXT_color_buffer_float"),$}function T(y,_){let I;return y?_===null||_===tn||_===Fi?I=i.DEPTH24_STENCIL8:_===Zt?I=i.DEPTH32F_STENCIL8:_===Ni&&(I=i.DEPTH24_STENCIL8,Le("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):_===null||_===tn||_===Fi?I=i.DEPTH_COMPONENT24:_===Zt?I=i.DEPTH_COMPONENT32F:_===Ni&&(I=i.DEPTH_COMPONENT16),I}function P(y,_){return m(y)===!0||y.isFramebufferTexture&&y.minFilter!==Mt&&y.minFilter!==bt?Math.log2(Math.max(_.width,_.height))+1:y.mipmaps!==void 0&&y.mipmaps.length>0?y.mipmaps.length:y.isCompressedTexture&&Array.isArray(y.image)?_.mipmaps.length:1}function R(y){const _=y.target;_.removeEventListener("dispose",R),v(_),_.isVideoTexture&&f.delete(_)}function L(y){const _=y.target;_.removeEventListener("dispose",L),O(_)}function v(y){const _=n.get(y);if(_.__webglInit===void 0)return;const I=y.source,K=h.get(I);if(K){const Z=K[_.__cacheKey];Z.usedTimes--,Z.usedTimes===0&&E(y),Object.keys(K).length===0&&h.delete(I)}n.remove(y)}function E(y){const _=n.get(y);i.deleteTexture(_.__webglTexture);const I=y.source,K=h.get(I);delete K[_.__cacheKey],s.memory.textures--}function O(y){const _=n.get(y);if(y.depthTexture&&(y.depthTexture.dispose(),n.remove(y.depthTexture)),y.isWebGLCubeRenderTarget)for(let K=0;K<6;K++){if(Array.isArray(_.__webglFramebuffer[K]))for(let Z=0;Z<_.__webglFramebuffer[K].length;Z++)i.deleteFramebuffer(_.__webglFramebuffer[K][Z]);else i.deleteFramebuffer(_.__webglFramebuffer[K]);_.__webglDepthbuffer&&i.deleteRenderbuffer(_.__webglDepthbuffer[K])}else{if(Array.isArray(_.__webglFramebuffer))for(let K=0;K<_.__webglFramebuffer.length;K++)i.deleteFramebuffer(_.__webglFramebuffer[K]);else i.deleteFramebuffer(_.__webglFramebuffer);if(_.__webglDepthbuffer&&i.deleteRenderbuffer(_.__webglDepthbuffer),_.__webglMultisampledFramebuffer&&i.deleteFramebuffer(_.__webglMultisampledFramebuffer),_.__webglColorRenderbuffer)for(let K=0;K<_.__webglColorRenderbuffer.length;K++)_.__webglColorRenderbuffer[K]&&i.deleteRenderbuffer(_.__webglColorRenderbuffer[K]);_.__webglDepthRenderbuffer&&i.deleteRenderbuffer(_.__webglDepthRenderbuffer)}const I=y.textures;for(let K=0,Z=I.length;K<Z;K++){const $=n.get(I[K]);$.__webglTexture&&(i.deleteTexture($.__webglTexture),s.memory.textures--),n.remove(I[K])}n.remove(y)}let w=0;function k(){w=0}function z(){const y=w;return y>=r.maxTextures&&Le("WebGLTextures: Trying to use "+y+" texture units while this GPU supports only "+r.maxTextures),w+=1,y}function Y(y){const _=[];return _.push(y.wrapS),_.push(y.wrapT),_.push(y.wrapR||0),_.push(y.magFilter),_.push(y.minFilter),_.push(y.anisotropy),_.push(y.internalFormat),_.push(y.format),_.push(y.type),_.push(y.generateMipmaps),_.push(y.premultiplyAlpha),_.push(y.flipY),_.push(y.unpackAlignment),_.push(y.colorSpace),_.join()}function V(y,_){const I=n.get(y);if(y.isVideoTexture&&$e(y),y.isRenderTargetTexture===!1&&y.isExternalTexture!==!0&&y.version>0&&I.__version!==y.version){const K=y.image;if(K===null)Le("WebGLRenderer: Texture marked for update but no image data found.");else if(K.complete===!1)Le("WebGLRenderer: Texture marked for update but image is incomplete");else{X(I,y,_);return}}else y.isExternalTexture&&(I.__webglTexture=y.sourceTexture?y.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,I.__webglTexture,i.TEXTURE0+_)}function H(y,_){const I=n.get(y);if(y.isRenderTargetTexture===!1&&y.version>0&&I.__version!==y.version){X(I,y,_);return}else y.isExternalTexture&&(I.__webglTexture=y.sourceTexture?y.sourceTexture:null);t.bindTexture(i.TEXTURE_2D_ARRAY,I.__webglTexture,i.TEXTURE0+_)}function N(y,_){const I=n.get(y);if(y.isRenderTargetTexture===!1&&y.version>0&&I.__version!==y.version){X(I,y,_);return}t.bindTexture(i.TEXTURE_3D,I.__webglTexture,i.TEXTURE0+_)}function te(y,_){const I=n.get(y);if(y.isCubeDepthTexture!==!0&&y.version>0&&I.__version!==y.version){ne(I,y,_);return}t.bindTexture(i.TEXTURE_CUBE_MAP,I.__webglTexture,i.TEXTURE0+_)}const j={[Ga]:i.REPEAT,[pn]:i.CLAMP_TO_EDGE,[Va]:i.MIRRORED_REPEAT},he={[Mt]:i.NEAREST,[tu]:i.NEAREST_MIPMAP_NEAREST,[Yi]:i.NEAREST_MIPMAP_LINEAR,[bt]:i.LINEAR,[Yr]:i.LINEAR_MIPMAP_NEAREST,[Hn]:i.LINEAR_MIPMAP_LINEAR},J={[ru]:i.NEVER,[cu]:i.ALWAYS,[au]:i.LESS,[Vs]:i.LEQUAL,[su]:i.EQUAL,[ks]:i.GEQUAL,[ou]:i.GREATER,[lu]:i.NOTEQUAL};function ie(y,_){if(_.type===Zt&&e.has("OES_texture_float_linear")===!1&&(_.magFilter===bt||_.magFilter===Yr||_.magFilter===Yi||_.magFilter===Hn||_.minFilter===bt||_.minFilter===Yr||_.minFilter===Yi||_.minFilter===Hn)&&Le("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(y,i.TEXTURE_WRAP_S,j[_.wrapS]),i.texParameteri(y,i.TEXTURE_WRAP_T,j[_.wrapT]),(y===i.TEXTURE_3D||y===i.TEXTURE_2D_ARRAY)&&i.texParameteri(y,i.TEXTURE_WRAP_R,j[_.wrapR]),i.texParameteri(y,i.TEXTURE_MAG_FILTER,he[_.magFilter]),i.texParameteri(y,i.TEXTURE_MIN_FILTER,he[_.minFilter]),_.compareFunction&&(i.texParameteri(y,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(y,i.TEXTURE_COMPARE_FUNC,J[_.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(_.magFilter===Mt||_.minFilter!==Yi&&_.minFilter!==Hn||_.type===Zt&&e.has("OES_texture_float_linear")===!1)return;if(_.anisotropy>1||n.get(_).__currentAnisotropy){const I=e.get("EXT_texture_filter_anisotropic");i.texParameterf(y,I.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(_.anisotropy,r.getMaxAnisotropy())),n.get(_).__currentAnisotropy=_.anisotropy}}}function Ae(y,_){let I=!1;y.__webglInit===void 0&&(y.__webglInit=!0,_.addEventListener("dispose",R));const K=_.source;let Z=h.get(K);Z===void 0&&(Z={},h.set(K,Z));const $=Y(_);if($!==y.__cacheKey){Z[$]===void 0&&(Z[$]={texture:i.createTexture(),usedTimes:0},s.memory.textures++,I=!0),Z[$].usedTimes++;const _e=Z[y.__cacheKey];_e!==void 0&&(Z[y.__cacheKey].usedTimes--,_e.usedTimes===0&&E(_)),y.__cacheKey=$,y.__webglTexture=Z[$].texture}return I}function ke(y,_,I){return Math.floor(Math.floor(y/I)/_)}function Ve(y,_,I,K){const $=y.updateRanges;if($.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,_.width,_.height,I,K,_.data);else{$.sort((Q,re)=>Q.start-re.start);let _e=0;for(let Q=1;Q<$.length;Q++){const re=$[_e],ge=$[Q],xe=re.start+re.count,fe=ke(ge.start,_.width,4),Oe=ke(re.start,_.width,4);ge.start<=xe+1&&fe===Oe&&ke(ge.start+ge.count-1,_.width,4)===fe?re.count=Math.max(re.count,ge.start+ge.count-re.start):(++_e,$[_e]=ge)}$.length=_e+1;const se=i.getParameter(i.UNPACK_ROW_LENGTH),be=i.getParameter(i.UNPACK_SKIP_PIXELS),we=i.getParameter(i.UNPACK_SKIP_ROWS);i.pixelStorei(i.UNPACK_ROW_LENGTH,_.width);for(let Q=0,re=$.length;Q<re;Q++){const ge=$[Q],xe=Math.floor(ge.start/4),fe=Math.ceil(ge.count/4),Oe=xe%_.width,D=Math.floor(xe/_.width),oe=fe,ae=1;i.pixelStorei(i.UNPACK_SKIP_PIXELS,Oe),i.pixelStorei(i.UNPACK_SKIP_ROWS,D),t.texSubImage2D(i.TEXTURE_2D,0,Oe,D,oe,ae,I,K,_.data)}y.clearUpdateRanges(),i.pixelStorei(i.UNPACK_ROW_LENGTH,se),i.pixelStorei(i.UNPACK_SKIP_PIXELS,be),i.pixelStorei(i.UNPACK_SKIP_ROWS,we)}}function X(y,_,I){let K=i.TEXTURE_2D;(_.isDataArrayTexture||_.isCompressedArrayTexture)&&(K=i.TEXTURE_2D_ARRAY),_.isData3DTexture&&(K=i.TEXTURE_3D);const Z=Ae(y,_),$=_.source;t.bindTexture(K,y.__webglTexture,i.TEXTURE0+I);const _e=n.get($);if($.version!==_e.__version||Z===!0){t.activeTexture(i.TEXTURE0+I);const se=Xe.getPrimaries(Xe.workingColorSpace),be=_.colorSpace===wn?null:Xe.getPrimaries(_.colorSpace),we=_.colorSpace===wn||se===be?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,_.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,_.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,we);let Q=S(_.image,!1,r.maxTextureSize);Q=it(_,Q);const re=a.convert(_.format,_.colorSpace),ge=a.convert(_.type);let xe=b(_.internalFormat,re,ge,_.colorSpace,_.isVideoTexture);ie(K,_);let fe;const Oe=_.mipmaps,D=_.isVideoTexture!==!0,oe=_e.__version===void 0||Z===!0,ae=$.dataReady,me=P(_,Q);if(_.isDepthTexture)xe=T(_.format===Wn,_.type),oe&&(D?t.texStorage2D(i.TEXTURE_2D,1,xe,Q.width,Q.height):t.texImage2D(i.TEXTURE_2D,0,xe,Q.width,Q.height,0,re,ge,null));else if(_.isDataTexture)if(Oe.length>0){D&&oe&&t.texStorage2D(i.TEXTURE_2D,me,xe,Oe[0].width,Oe[0].height);for(let ee=0,q=Oe.length;ee<q;ee++)fe=Oe[ee],D?ae&&t.texSubImage2D(i.TEXTURE_2D,ee,0,0,fe.width,fe.height,re,ge,fe.data):t.texImage2D(i.TEXTURE_2D,ee,xe,fe.width,fe.height,0,re,ge,fe.data);_.generateMipmaps=!1}else D?(oe&&t.texStorage2D(i.TEXTURE_2D,me,xe,Q.width,Q.height),ae&&Ve(_,Q,re,ge)):t.texImage2D(i.TEXTURE_2D,0,xe,Q.width,Q.height,0,re,ge,Q.data);else if(_.isCompressedTexture)if(_.isCompressedArrayTexture){D&&oe&&t.texStorage3D(i.TEXTURE_2D_ARRAY,me,xe,Oe[0].width,Oe[0].height,Q.depth);for(let ee=0,q=Oe.length;ee<q;ee++)if(fe=Oe[ee],_.format!==Xt)if(re!==null)if(D){if(ae)if(_.layerUpdates.size>0){const ve=Ko(fe.width,fe.height,_.format,_.type);for(const Pe of _.layerUpdates){const rt=fe.data.subarray(Pe*ve/fe.data.BYTES_PER_ELEMENT,(Pe+1)*ve/fe.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,ee,0,0,Pe,fe.width,fe.height,1,re,rt)}_.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,ee,0,0,0,fe.width,fe.height,Q.depth,re,fe.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,ee,xe,fe.width,fe.height,Q.depth,0,fe.data,0,0);else Le("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else D?ae&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,ee,0,0,0,fe.width,fe.height,Q.depth,re,ge,fe.data):t.texImage3D(i.TEXTURE_2D_ARRAY,ee,xe,fe.width,fe.height,Q.depth,0,re,ge,fe.data)}else{D&&oe&&t.texStorage2D(i.TEXTURE_2D,me,xe,Oe[0].width,Oe[0].height);for(let ee=0,q=Oe.length;ee<q;ee++)fe=Oe[ee],_.format!==Xt?re!==null?D?ae&&t.compressedTexSubImage2D(i.TEXTURE_2D,ee,0,0,fe.width,fe.height,re,fe.data):t.compressedTexImage2D(i.TEXTURE_2D,ee,xe,fe.width,fe.height,0,fe.data):Le("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):D?ae&&t.texSubImage2D(i.TEXTURE_2D,ee,0,0,fe.width,fe.height,re,ge,fe.data):t.texImage2D(i.TEXTURE_2D,ee,xe,fe.width,fe.height,0,re,ge,fe.data)}else if(_.isDataArrayTexture)if(D){if(oe&&t.texStorage3D(i.TEXTURE_2D_ARRAY,me,xe,Q.width,Q.height,Q.depth),ae)if(_.layerUpdates.size>0){const ee=Ko(Q.width,Q.height,_.format,_.type);for(const q of _.layerUpdates){const ve=Q.data.subarray(q*ee/Q.data.BYTES_PER_ELEMENT,(q+1)*ee/Q.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,q,Q.width,Q.height,1,re,ge,ve)}_.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,Q.width,Q.height,Q.depth,re,ge,Q.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,xe,Q.width,Q.height,Q.depth,0,re,ge,Q.data);else if(_.isData3DTexture)D?(oe&&t.texStorage3D(i.TEXTURE_3D,me,xe,Q.width,Q.height,Q.depth),ae&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,Q.width,Q.height,Q.depth,re,ge,Q.data)):t.texImage3D(i.TEXTURE_3D,0,xe,Q.width,Q.height,Q.depth,0,re,ge,Q.data);else if(_.isFramebufferTexture){if(oe)if(D)t.texStorage2D(i.TEXTURE_2D,me,xe,Q.width,Q.height);else{let ee=Q.width,q=Q.height;for(let ve=0;ve<me;ve++)t.texImage2D(i.TEXTURE_2D,ve,xe,ee,q,0,re,ge,null),ee>>=1,q>>=1}}else if(Oe.length>0){if(D&&oe){const ee=Se(Oe[0]);t.texStorage2D(i.TEXTURE_2D,me,xe,ee.width,ee.height)}for(let ee=0,q=Oe.length;ee<q;ee++)fe=Oe[ee],D?ae&&t.texSubImage2D(i.TEXTURE_2D,ee,0,0,re,ge,fe):t.texImage2D(i.TEXTURE_2D,ee,xe,re,ge,fe);_.generateMipmaps=!1}else if(D){if(oe){const ee=Se(Q);t.texStorage2D(i.TEXTURE_2D,me,xe,ee.width,ee.height)}ae&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,re,ge,Q)}else t.texImage2D(i.TEXTURE_2D,0,xe,re,ge,Q);m(_)&&u(K),_e.__version=$.version,_.onUpdate&&_.onUpdate(_)}y.__version=_.version}function ne(y,_,I){if(_.image.length!==6)return;const K=Ae(y,_),Z=_.source;t.bindTexture(i.TEXTURE_CUBE_MAP,y.__webglTexture,i.TEXTURE0+I);const $=n.get(Z);if(Z.version!==$.__version||K===!0){t.activeTexture(i.TEXTURE0+I);const _e=Xe.getPrimaries(Xe.workingColorSpace),se=_.colorSpace===wn?null:Xe.getPrimaries(_.colorSpace),be=_.colorSpace===wn||_e===se?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,_.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,_.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,be);const we=_.isCompressedTexture||_.image[0].isCompressedTexture,Q=_.image[0]&&_.image[0].isDataTexture,re=[];for(let q=0;q<6;q++)!we&&!Q?re[q]=S(_.image[q],!0,r.maxCubemapSize):re[q]=Q?_.image[q].image:_.image[q],re[q]=it(_,re[q]);const ge=re[0],xe=a.convert(_.format,_.colorSpace),fe=a.convert(_.type),Oe=b(_.internalFormat,xe,fe,_.colorSpace),D=_.isVideoTexture!==!0,oe=$.__version===void 0||K===!0,ae=Z.dataReady;let me=P(_,ge);ie(i.TEXTURE_CUBE_MAP,_);let ee;if(we){D&&oe&&t.texStorage2D(i.TEXTURE_CUBE_MAP,me,Oe,ge.width,ge.height);for(let q=0;q<6;q++){ee=re[q].mipmaps;for(let ve=0;ve<ee.length;ve++){const Pe=ee[ve];_.format!==Xt?xe!==null?D?ae&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+q,ve,0,0,Pe.width,Pe.height,xe,Pe.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+q,ve,Oe,Pe.width,Pe.height,0,Pe.data):Le("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):D?ae&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+q,ve,0,0,Pe.width,Pe.height,xe,fe,Pe.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+q,ve,Oe,Pe.width,Pe.height,0,xe,fe,Pe.data)}}}else{if(ee=_.mipmaps,D&&oe){ee.length>0&&me++;const q=Se(re[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,me,Oe,q.width,q.height)}for(let q=0;q<6;q++)if(Q){D?ae&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+q,0,0,0,re[q].width,re[q].height,xe,fe,re[q].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+q,0,Oe,re[q].width,re[q].height,0,xe,fe,re[q].data);for(let ve=0;ve<ee.length;ve++){const rt=ee[ve].image[q].image;D?ae&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+q,ve+1,0,0,rt.width,rt.height,xe,fe,rt.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+q,ve+1,Oe,rt.width,rt.height,0,xe,fe,rt.data)}}else{D?ae&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+q,0,0,0,xe,fe,re[q]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+q,0,Oe,xe,fe,re[q]);for(let ve=0;ve<ee.length;ve++){const Pe=ee[ve];D?ae&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+q,ve+1,0,0,xe,fe,Pe.image[q]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+q,ve+1,Oe,xe,fe,Pe.image[q])}}}m(_)&&u(i.TEXTURE_CUBE_MAP),$.__version=Z.version,_.onUpdate&&_.onUpdate(_)}y.__version=_.version}function le(y,_,I,K,Z,$){const _e=a.convert(I.format,I.colorSpace),se=a.convert(I.type),be=b(I.internalFormat,_e,se,I.colorSpace),we=n.get(_),Q=n.get(I);if(Q.__renderTarget=_,!we.__hasExternalTextures){const re=Math.max(1,_.width>>$),ge=Math.max(1,_.height>>$);Z===i.TEXTURE_3D||Z===i.TEXTURE_2D_ARRAY?t.texImage3D(Z,$,be,re,ge,_.depth,0,_e,se,null):t.texImage2D(Z,$,be,re,ge,0,_e,se,null)}t.bindFramebuffer(i.FRAMEBUFFER,y),dt(_)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,K,Z,Q.__webglTexture,0,C(_)):(Z===i.TEXTURE_2D||Z>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&Z<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,K,Z,Q.__webglTexture,$),t.bindFramebuffer(i.FRAMEBUFFER,null)}function Ie(y,_,I){if(i.bindRenderbuffer(i.RENDERBUFFER,y),_.depthBuffer){const K=_.depthTexture,Z=K&&K.isDepthTexture?K.type:null,$=T(_.stencilBuffer,Z),_e=_.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;dt(_)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,C(_),$,_.width,_.height):I?i.renderbufferStorageMultisample(i.RENDERBUFFER,C(_),$,_.width,_.height):i.renderbufferStorage(i.RENDERBUFFER,$,_.width,_.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,_e,i.RENDERBUFFER,y)}else{const K=_.textures;for(let Z=0;Z<K.length;Z++){const $=K[Z],_e=a.convert($.format,$.colorSpace),se=a.convert($.type),be=b($.internalFormat,_e,se,$.colorSpace);dt(_)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,C(_),be,_.width,_.height):I?i.renderbufferStorageMultisample(i.RENDERBUFFER,C(_),be,_.width,_.height):i.renderbufferStorage(i.RENDERBUFFER,be,_.width,_.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function Re(y,_,I){const K=_.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(i.FRAMEBUFFER,y),!(_.depthTexture&&_.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const Z=n.get(_.depthTexture);if(Z.__renderTarget=_,(!Z.__webglTexture||_.depthTexture.image.width!==_.width||_.depthTexture.image.height!==_.height)&&(_.depthTexture.image.width=_.width,_.depthTexture.image.height=_.height,_.depthTexture.needsUpdate=!0),K){if(Z.__webglInit===void 0&&(Z.__webglInit=!0,_.depthTexture.addEventListener("dispose",R)),Z.__webglTexture===void 0){Z.__webglTexture=i.createTexture(),t.bindTexture(i.TEXTURE_CUBE_MAP,Z.__webglTexture),ie(i.TEXTURE_CUBE_MAP,_.depthTexture);const we=a.convert(_.depthTexture.format),Q=a.convert(_.depthTexture.type);let re;_.depthTexture.format===vn?re=i.DEPTH_COMPONENT24:_.depthTexture.format===Wn&&(re=i.DEPTH24_STENCIL8);for(let ge=0;ge<6;ge++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ge,0,re,_.width,_.height,0,we,Q,null)}}else V(_.depthTexture,0);const $=Z.__webglTexture,_e=C(_),se=K?i.TEXTURE_CUBE_MAP_POSITIVE_X+I:i.TEXTURE_2D,be=_.depthTexture.format===Wn?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(_.depthTexture.format===vn)dt(_)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,be,se,$,0,_e):i.framebufferTexture2D(i.FRAMEBUFFER,be,se,$,0);else if(_.depthTexture.format===Wn)dt(_)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,be,se,$,0,_e):i.framebufferTexture2D(i.FRAMEBUFFER,be,se,$,0);else throw new Error("Unknown depthTexture format")}function Ce(y){const _=n.get(y),I=y.isWebGLCubeRenderTarget===!0;if(_.__boundDepthTexture!==y.depthTexture){const K=y.depthTexture;if(_.__depthDisposeCallback&&_.__depthDisposeCallback(),K){const Z=()=>{delete _.__boundDepthTexture,delete _.__depthDisposeCallback,K.removeEventListener("dispose",Z)};K.addEventListener("dispose",Z),_.__depthDisposeCallback=Z}_.__boundDepthTexture=K}if(y.depthTexture&&!_.__autoAllocateDepthBuffer)if(I)for(let K=0;K<6;K++)Re(_.__webglFramebuffer[K],y,K);else{const K=y.texture.mipmaps;K&&K.length>0?Re(_.__webglFramebuffer[0],y,0):Re(_.__webglFramebuffer,y,0)}else if(I){_.__webglDepthbuffer=[];for(let K=0;K<6;K++)if(t.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer[K]),_.__webglDepthbuffer[K]===void 0)_.__webglDepthbuffer[K]=i.createRenderbuffer(),Ie(_.__webglDepthbuffer[K],y,!1);else{const Z=y.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,$=_.__webglDepthbuffer[K];i.bindRenderbuffer(i.RENDERBUFFER,$),i.framebufferRenderbuffer(i.FRAMEBUFFER,Z,i.RENDERBUFFER,$)}}else{const K=y.texture.mipmaps;if(K&&K.length>0?t.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer),_.__webglDepthbuffer===void 0)_.__webglDepthbuffer=i.createRenderbuffer(),Ie(_.__webglDepthbuffer,y,!1);else{const Z=y.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,$=_.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,$),i.framebufferRenderbuffer(i.FRAMEBUFFER,Z,i.RENDERBUFFER,$)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function _t(y,_,I){const K=n.get(y);_!==void 0&&le(K.__webglFramebuffer,y,y.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),I!==void 0&&Ce(y)}function He(y){const _=y.texture,I=n.get(y),K=n.get(_);y.addEventListener("dispose",L);const Z=y.textures,$=y.isWebGLCubeRenderTarget===!0,_e=Z.length>1;if(_e||(K.__webglTexture===void 0&&(K.__webglTexture=i.createTexture()),K.__version=_.version,s.memory.textures++),$){I.__webglFramebuffer=[];for(let se=0;se<6;se++)if(_.mipmaps&&_.mipmaps.length>0){I.__webglFramebuffer[se]=[];for(let be=0;be<_.mipmaps.length;be++)I.__webglFramebuffer[se][be]=i.createFramebuffer()}else I.__webglFramebuffer[se]=i.createFramebuffer()}else{if(_.mipmaps&&_.mipmaps.length>0){I.__webglFramebuffer=[];for(let se=0;se<_.mipmaps.length;se++)I.__webglFramebuffer[se]=i.createFramebuffer()}else I.__webglFramebuffer=i.createFramebuffer();if(_e)for(let se=0,be=Z.length;se<be;se++){const we=n.get(Z[se]);we.__webglTexture===void 0&&(we.__webglTexture=i.createTexture(),s.memory.textures++)}if(y.samples>0&&dt(y)===!1){I.__webglMultisampledFramebuffer=i.createFramebuffer(),I.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,I.__webglMultisampledFramebuffer);for(let se=0;se<Z.length;se++){const be=Z[se];I.__webglColorRenderbuffer[se]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,I.__webglColorRenderbuffer[se]);const we=a.convert(be.format,be.colorSpace),Q=a.convert(be.type),re=b(be.internalFormat,we,Q,be.colorSpace,y.isXRRenderTarget===!0),ge=C(y);i.renderbufferStorageMultisample(i.RENDERBUFFER,ge,re,y.width,y.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+se,i.RENDERBUFFER,I.__webglColorRenderbuffer[se])}i.bindRenderbuffer(i.RENDERBUFFER,null),y.depthBuffer&&(I.__webglDepthRenderbuffer=i.createRenderbuffer(),Ie(I.__webglDepthRenderbuffer,y,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if($){t.bindTexture(i.TEXTURE_CUBE_MAP,K.__webglTexture),ie(i.TEXTURE_CUBE_MAP,_);for(let se=0;se<6;se++)if(_.mipmaps&&_.mipmaps.length>0)for(let be=0;be<_.mipmaps.length;be++)le(I.__webglFramebuffer[se][be],y,_,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+se,be);else le(I.__webglFramebuffer[se],y,_,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+se,0);m(_)&&u(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(_e){for(let se=0,be=Z.length;se<be;se++){const we=Z[se],Q=n.get(we);let re=i.TEXTURE_2D;(y.isWebGL3DRenderTarget||y.isWebGLArrayRenderTarget)&&(re=y.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(re,Q.__webglTexture),ie(re,we),le(I.__webglFramebuffer,y,we,i.COLOR_ATTACHMENT0+se,re,0),m(we)&&u(re)}t.unbindTexture()}else{let se=i.TEXTURE_2D;if((y.isWebGL3DRenderTarget||y.isWebGLArrayRenderTarget)&&(se=y.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(se,K.__webglTexture),ie(se,_),_.mipmaps&&_.mipmaps.length>0)for(let be=0;be<_.mipmaps.length;be++)le(I.__webglFramebuffer[be],y,_,i.COLOR_ATTACHMENT0,se,be);else le(I.__webglFramebuffer,y,_,i.COLOR_ATTACHMENT0,se,0);m(_)&&u(se),t.unbindTexture()}y.depthBuffer&&Ce(y)}function Ke(y){const _=y.textures;for(let I=0,K=_.length;I<K;I++){const Z=_[I];if(m(Z)){const $=M(y),_e=n.get(Z).__webglTexture;t.bindTexture($,_e),u($),t.unbindTexture()}}}const et=[],Fe=[];function lt(y){if(y.samples>0){if(dt(y)===!1){const _=y.textures,I=y.width,K=y.height;let Z=i.COLOR_BUFFER_BIT;const $=y.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,_e=n.get(y),se=_.length>1;if(se)for(let we=0;we<_.length;we++)t.bindFramebuffer(i.FRAMEBUFFER,_e.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+we,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,_e.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+we,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,_e.__webglMultisampledFramebuffer);const be=y.texture.mipmaps;be&&be.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,_e.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,_e.__webglFramebuffer);for(let we=0;we<_.length;we++){if(y.resolveDepthBuffer&&(y.depthBuffer&&(Z|=i.DEPTH_BUFFER_BIT),y.stencilBuffer&&y.resolveStencilBuffer&&(Z|=i.STENCIL_BUFFER_BIT)),se){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,_e.__webglColorRenderbuffer[we]);const Q=n.get(_[we]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Q,0)}i.blitFramebuffer(0,0,I,K,0,0,I,K,Z,i.NEAREST),c===!0&&(et.length=0,Fe.length=0,et.push(i.COLOR_ATTACHMENT0+we),y.depthBuffer&&y.resolveDepthBuffer===!1&&(et.push($),Fe.push($),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,Fe)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,et))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),se)for(let we=0;we<_.length;we++){t.bindFramebuffer(i.FRAMEBUFFER,_e.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+we,i.RENDERBUFFER,_e.__webglColorRenderbuffer[we]);const Q=n.get(_[we]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,_e.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+we,i.TEXTURE_2D,Q,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,_e.__webglMultisampledFramebuffer)}else if(y.depthBuffer&&y.resolveDepthBuffer===!1&&c){const _=y.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[_])}}}function C(y){return Math.min(r.maxSamples,y.samples)}function dt(y){const _=n.get(y);return y.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&_.__useRenderToTexture!==!1}function $e(y){const _=s.render.frame;f.get(y)!==_&&(f.set(y,_),y.update())}function it(y,_){const I=y.colorSpace,K=y.format,Z=y.type;return y.isCompressedTexture===!0||y.isVideoTexture===!0||I!==_i&&I!==wn&&(Xe.getTransfer(I)===je?(K!==Xt||Z!==It)&&Le("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):We("WebGLTextures: Unsupported texture color space:",I)),_}function Se(y){return typeof HTMLImageElement<"u"&&y instanceof HTMLImageElement?(l.width=y.naturalWidth||y.width,l.height=y.naturalHeight||y.height):typeof VideoFrame<"u"&&y instanceof VideoFrame?(l.width=y.displayWidth,l.height=y.displayHeight):(l.width=y.width,l.height=y.height),l}this.allocateTextureUnit=z,this.resetTextureUnits=k,this.setTexture2D=V,this.setTexture2DArray=H,this.setTexture3D=N,this.setTextureCube=te,this.rebindTextures=_t,this.setupRenderTarget=He,this.updateRenderTargetMipmap=Ke,this.updateMultisampleRenderTarget=lt,this.setupDepthRenderbuffer=Ce,this.setupFrameBufferTexture=le,this.useMultisampledRTT=dt,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function Hm(i,e){function t(n,r=wn){let a;const s=Xe.getTransfer(r);if(n===It)return i.UNSIGNED_BYTE;if(n===Fs)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Os)return i.UNSIGNED_SHORT_5_5_5_1;if(n===Wl)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Xl)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===kl)return i.BYTE;if(n===Hl)return i.SHORT;if(n===Ni)return i.UNSIGNED_SHORT;if(n===Ns)return i.INT;if(n===tn)return i.UNSIGNED_INT;if(n===Zt)return i.FLOAT;if(n===gn)return i.HALF_FLOAT;if(n===ql)return i.ALPHA;if(n===Yl)return i.RGB;if(n===Xt)return i.RGBA;if(n===vn)return i.DEPTH_COMPONENT;if(n===Wn)return i.DEPTH_STENCIL;if(n===$l)return i.RED;if(n===Bs)return i.RED_INTEGER;if(n===mi)return i.RG;if(n===zs)return i.RG_INTEGER;if(n===Gs)return i.RGBA_INTEGER;if(n===Er||n===yr||n===Tr||n===br)if(s===je)if(a=e.get("WEBGL_compressed_texture_s3tc_srgb"),a!==null){if(n===Er)return a.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===yr)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Tr)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===br)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(a=e.get("WEBGL_compressed_texture_s3tc"),a!==null){if(n===Er)return a.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===yr)return a.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Tr)return a.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===br)return a.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===ka||n===Ha||n===Wa||n===Xa)if(a=e.get("WEBGL_compressed_texture_pvrtc"),a!==null){if(n===ka)return a.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Ha)return a.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Wa)return a.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Xa)return a.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===qa||n===Ya||n===$a||n===Ka||n===Za||n===ja||n===Ja)if(a=e.get("WEBGL_compressed_texture_etc"),a!==null){if(n===qa||n===Ya)return s===je?a.COMPRESSED_SRGB8_ETC2:a.COMPRESSED_RGB8_ETC2;if(n===$a)return s===je?a.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:a.COMPRESSED_RGBA8_ETC2_EAC;if(n===Ka)return a.COMPRESSED_R11_EAC;if(n===Za)return a.COMPRESSED_SIGNED_R11_EAC;if(n===ja)return a.COMPRESSED_RG11_EAC;if(n===Ja)return a.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===Qa||n===es||n===ts||n===ns||n===is||n===rs||n===as||n===ss||n===os||n===ls||n===cs||n===us||n===ds||n===hs)if(a=e.get("WEBGL_compressed_texture_astc"),a!==null){if(n===Qa)return s===je?a.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:a.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===es)return s===je?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:a.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===ts)return s===je?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:a.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===ns)return s===je?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:a.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===is)return s===je?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:a.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===rs)return s===je?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:a.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===as)return s===je?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:a.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===ss)return s===je?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:a.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===os)return s===je?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:a.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===ls)return s===je?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:a.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===cs)return s===je?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:a.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===us)return s===je?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:a.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===ds)return s===je?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:a.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===hs)return s===je?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:a.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===fs||n===ps||n===ms)if(a=e.get("EXT_texture_compression_bptc"),a!==null){if(n===fs)return s===je?a.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:a.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===ps)return a.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===ms)return a.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===_s||n===gs||n===vs||n===xs)if(a=e.get("EXT_texture_compression_rgtc"),a!==null){if(n===_s)return a.COMPRESSED_RED_RGTC1_EXT;if(n===gs)return a.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===vs)return a.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===xs)return a.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Fi?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}const Wm=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Xm=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class qm{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const n=new ic(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new rn({vertexShader:Wm,fragmentShader:Xm,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Bt(new zr(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Ym extends vi{constructor(e,t){super();const n=this;let r=null,a=1,s=null,o="local-floor",c=1,l=null,f=null,d=null,h=null,p=null,g=null;const S=typeof XRWebGLBinding<"u",m=new qm,u={},M=t.getContextAttributes();let b=null,T=null;const P=[],R=[],L=new Ye;let v=null;const E=new Ot;E.viewport=new ot;const O=new Ot;O.viewport=new ot;const w=[E,O],k=new id;let z=null,Y=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(X){let ne=P[X];return ne===void 0&&(ne=new ta,P[X]=ne),ne.getTargetRaySpace()},this.getControllerGrip=function(X){let ne=P[X];return ne===void 0&&(ne=new ta,P[X]=ne),ne.getGripSpace()},this.getHand=function(X){let ne=P[X];return ne===void 0&&(ne=new ta,P[X]=ne),ne.getHandSpace()};function V(X){const ne=R.indexOf(X.inputSource);if(ne===-1)return;const le=P[ne];le!==void 0&&(le.update(X.inputSource,X.frame,l||s),le.dispatchEvent({type:X.type,data:X.inputSource}))}function H(){r.removeEventListener("select",V),r.removeEventListener("selectstart",V),r.removeEventListener("selectend",V),r.removeEventListener("squeeze",V),r.removeEventListener("squeezestart",V),r.removeEventListener("squeezeend",V),r.removeEventListener("end",H),r.removeEventListener("inputsourceschange",N);for(let X=0;X<P.length;X++){const ne=R[X];ne!==null&&(R[X]=null,P[X].disconnect(ne))}z=null,Y=null,m.reset();for(const X in u)delete u[X];e.setRenderTarget(b),p=null,h=null,d=null,r=null,T=null,Ve.stop(),n.isPresenting=!1,e.setPixelRatio(v),e.setSize(L.width,L.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(X){a=X,n.isPresenting===!0&&Le("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(X){o=X,n.isPresenting===!0&&Le("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||s},this.setReferenceSpace=function(X){l=X},this.getBaseLayer=function(){return h!==null?h:p},this.getBinding=function(){return d===null&&S&&(d=new XRWebGLBinding(r,t)),d},this.getFrame=function(){return g},this.getSession=function(){return r},this.setSession=async function(X){if(r=X,r!==null){if(b=e.getRenderTarget(),r.addEventListener("select",V),r.addEventListener("selectstart",V),r.addEventListener("selectend",V),r.addEventListener("squeeze",V),r.addEventListener("squeezestart",V),r.addEventListener("squeezeend",V),r.addEventListener("end",H),r.addEventListener("inputsourceschange",N),M.xrCompatible!==!0&&await t.makeXRCompatible(),v=e.getPixelRatio(),e.getSize(L),S&&"createProjectionLayer"in XRWebGLBinding.prototype){let le=null,Ie=null,Re=null;M.depth&&(Re=M.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,le=M.stencil?Wn:vn,Ie=M.stencil?Fi:tn);const Ce={colorFormat:t.RGBA8,depthFormat:Re,scaleFactor:a};d=this.getBinding(),h=d.createProjectionLayer(Ce),r.updateRenderState({layers:[h]}),e.setPixelRatio(1),e.setSize(h.textureWidth,h.textureHeight,!1),T=new Qt(h.textureWidth,h.textureHeight,{format:Xt,type:It,depthTexture:new zi(h.textureWidth,h.textureHeight,Ie,void 0,void 0,void 0,void 0,void 0,void 0,le),stencilBuffer:M.stencil,colorSpace:e.outputColorSpace,samples:M.antialias?4:0,resolveDepthBuffer:h.ignoreDepthValues===!1,resolveStencilBuffer:h.ignoreDepthValues===!1})}else{const le={antialias:M.antialias,alpha:!0,depth:M.depth,stencil:M.stencil,framebufferScaleFactor:a};p=new XRWebGLLayer(r,t,le),r.updateRenderState({baseLayer:p}),e.setPixelRatio(1),e.setSize(p.framebufferWidth,p.framebufferHeight,!1),T=new Qt(p.framebufferWidth,p.framebufferHeight,{format:Xt,type:It,colorSpace:e.outputColorSpace,stencilBuffer:M.stencil,resolveDepthBuffer:p.ignoreDepthValues===!1,resolveStencilBuffer:p.ignoreDepthValues===!1})}T.isXRRenderTarget=!0,this.setFoveation(c),l=null,s=await r.requestReferenceSpace(o),Ve.setContext(r),Ve.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function N(X){for(let ne=0;ne<X.removed.length;ne++){const le=X.removed[ne],Ie=R.indexOf(le);Ie>=0&&(R[Ie]=null,P[Ie].disconnect(le))}for(let ne=0;ne<X.added.length;ne++){const le=X.added[ne];let Ie=R.indexOf(le);if(Ie===-1){for(let Ce=0;Ce<P.length;Ce++)if(Ce>=R.length){R.push(le),Ie=Ce;break}else if(R[Ce]===null){R[Ce]=le,Ie=Ce;break}if(Ie===-1)break}const Re=P[Ie];Re&&Re.connect(le)}}const te=new B,j=new B;function he(X,ne,le){te.setFromMatrixPosition(ne.matrixWorld),j.setFromMatrixPosition(le.matrixWorld);const Ie=te.distanceTo(j),Re=ne.projectionMatrix.elements,Ce=le.projectionMatrix.elements,_t=Re[14]/(Re[10]-1),He=Re[14]/(Re[10]+1),Ke=(Re[9]+1)/Re[5],et=(Re[9]-1)/Re[5],Fe=(Re[8]-1)/Re[0],lt=(Ce[8]+1)/Ce[0],C=_t*Fe,dt=_t*lt,$e=Ie/(-Fe+lt),it=$e*-Fe;if(ne.matrixWorld.decompose(X.position,X.quaternion,X.scale),X.translateX(it),X.translateZ($e),X.matrixWorld.compose(X.position,X.quaternion,X.scale),X.matrixWorldInverse.copy(X.matrixWorld).invert(),Re[10]===-1)X.projectionMatrix.copy(ne.projectionMatrix),X.projectionMatrixInverse.copy(ne.projectionMatrixInverse);else{const Se=_t+$e,y=He+$e,_=C-it,I=dt+(Ie-it),K=Ke*He/y*Se,Z=et*He/y*Se;X.projectionMatrix.makePerspective(_,I,K,Z,Se,y),X.projectionMatrixInverse.copy(X.projectionMatrix).invert()}}function J(X,ne){ne===null?X.matrixWorld.copy(X.matrix):X.matrixWorld.multiplyMatrices(ne.matrixWorld,X.matrix),X.matrixWorldInverse.copy(X.matrixWorld).invert()}this.updateCamera=function(X){if(r===null)return;let ne=X.near,le=X.far;m.texture!==null&&(m.depthNear>0&&(ne=m.depthNear),m.depthFar>0&&(le=m.depthFar)),k.near=O.near=E.near=ne,k.far=O.far=E.far=le,(z!==k.near||Y!==k.far)&&(r.updateRenderState({depthNear:k.near,depthFar:k.far}),z=k.near,Y=k.far),k.layers.mask=X.layers.mask|6,E.layers.mask=k.layers.mask&-5,O.layers.mask=k.layers.mask&-3;const Ie=X.parent,Re=k.cameras;J(k,Ie);for(let Ce=0;Ce<Re.length;Ce++)J(Re[Ce],Ie);Re.length===2?he(k,E,O):k.projectionMatrix.copy(E.projectionMatrix),ie(X,k,Ie)};function ie(X,ne,le){le===null?X.matrix.copy(ne.matrixWorld):(X.matrix.copy(le.matrixWorld),X.matrix.invert(),X.matrix.multiply(ne.matrixWorld)),X.matrix.decompose(X.position,X.quaternion,X.scale),X.updateMatrixWorld(!0),X.projectionMatrix.copy(ne.projectionMatrix),X.projectionMatrixInverse.copy(ne.projectionMatrixInverse),X.isPerspectiveCamera&&(X.fov=Ms*2*Math.atan(1/X.projectionMatrix.elements[5]),X.zoom=1)}this.getCamera=function(){return k},this.getFoveation=function(){if(!(h===null&&p===null))return c},this.setFoveation=function(X){c=X,h!==null&&(h.fixedFoveation=X),p!==null&&p.fixedFoveation!==void 0&&(p.fixedFoveation=X)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(k)},this.getCameraTexture=function(X){return u[X]};let Ae=null;function ke(X,ne){if(f=ne.getViewerPose(l||s),g=ne,f!==null){const le=f.views;p!==null&&(e.setRenderTargetFramebuffer(T,p.framebuffer),e.setRenderTarget(T));let Ie=!1;le.length!==k.cameras.length&&(k.cameras.length=0,Ie=!0);for(let He=0;He<le.length;He++){const Ke=le[He];let et=null;if(p!==null)et=p.getViewport(Ke);else{const lt=d.getViewSubImage(h,Ke);et=lt.viewport,He===0&&(e.setRenderTargetTextures(T,lt.colorTexture,lt.depthStencilTexture),e.setRenderTarget(T))}let Fe=w[He];Fe===void 0&&(Fe=new Ot,Fe.layers.enable(He),Fe.viewport=new ot,w[He]=Fe),Fe.matrix.fromArray(Ke.transform.matrix),Fe.matrix.decompose(Fe.position,Fe.quaternion,Fe.scale),Fe.projectionMatrix.fromArray(Ke.projectionMatrix),Fe.projectionMatrixInverse.copy(Fe.projectionMatrix).invert(),Fe.viewport.set(et.x,et.y,et.width,et.height),He===0&&(k.matrix.copy(Fe.matrix),k.matrix.decompose(k.position,k.quaternion,k.scale)),Ie===!0&&k.cameras.push(Fe)}const Re=r.enabledFeatures;if(Re&&Re.includes("depth-sensing")&&r.depthUsage=="gpu-optimized"&&S){d=n.getBinding();const He=d.getDepthInformation(le[0]);He&&He.isValid&&He.texture&&m.init(He,r.renderState)}if(Re&&Re.includes("camera-access")&&S){e.state.unbindTexture(),d=n.getBinding();for(let He=0;He<le.length;He++){const Ke=le[He].camera;if(Ke){let et=u[Ke];et||(et=new ic,u[Ke]=et);const Fe=d.getCameraImage(Ke);et.sourceTexture=Fe}}}}for(let le=0;le<P.length;le++){const Ie=R[le],Re=P[le];Ie!==null&&Re!==void 0&&Re.update(Ie,ne,l||s)}Ae&&Ae(X,ne),ne.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:ne}),g=null}const Ve=new oc;Ve.setAnimationLoop(ke),this.setAnimationLoop=function(X){Ae=X},this.dispose=function(){}}}const Bn=new nn,$m=new at;function Km(i,e){function t(m,u){m.matrixAutoUpdate===!0&&m.updateMatrix(),u.value.copy(m.matrix)}function n(m,u){u.color.getRGB(m.fogColor.value,rc(i)),u.isFog?(m.fogNear.value=u.near,m.fogFar.value=u.far):u.isFogExp2&&(m.fogDensity.value=u.density)}function r(m,u,M,b,T){u.isMeshBasicMaterial?a(m,u):u.isMeshLambertMaterial?(a(m,u),u.envMap&&(m.envMapIntensity.value=u.envMapIntensity)):u.isMeshToonMaterial?(a(m,u),d(m,u)):u.isMeshPhongMaterial?(a(m,u),f(m,u),u.envMap&&(m.envMapIntensity.value=u.envMapIntensity)):u.isMeshStandardMaterial?(a(m,u),h(m,u),u.isMeshPhysicalMaterial&&p(m,u,T)):u.isMeshMatcapMaterial?(a(m,u),g(m,u)):u.isMeshDepthMaterial?a(m,u):u.isMeshDistanceMaterial?(a(m,u),S(m,u)):u.isMeshNormalMaterial?a(m,u):u.isLineBasicMaterial?(s(m,u),u.isLineDashedMaterial&&o(m,u)):u.isPointsMaterial?c(m,u,M,b):u.isSpriteMaterial?l(m,u):u.isShadowMaterial?(m.color.value.copy(u.color),m.opacity.value=u.opacity):u.isShaderMaterial&&(u.uniformsNeedUpdate=!1)}function a(m,u){m.opacity.value=u.opacity,u.color&&m.diffuse.value.copy(u.color),u.emissive&&m.emissive.value.copy(u.emissive).multiplyScalar(u.emissiveIntensity),u.map&&(m.map.value=u.map,t(u.map,m.mapTransform)),u.alphaMap&&(m.alphaMap.value=u.alphaMap,t(u.alphaMap,m.alphaMapTransform)),u.bumpMap&&(m.bumpMap.value=u.bumpMap,t(u.bumpMap,m.bumpMapTransform),m.bumpScale.value=u.bumpScale,u.side===wt&&(m.bumpScale.value*=-1)),u.normalMap&&(m.normalMap.value=u.normalMap,t(u.normalMap,m.normalMapTransform),m.normalScale.value.copy(u.normalScale),u.side===wt&&m.normalScale.value.negate()),u.displacementMap&&(m.displacementMap.value=u.displacementMap,t(u.displacementMap,m.displacementMapTransform),m.displacementScale.value=u.displacementScale,m.displacementBias.value=u.displacementBias),u.emissiveMap&&(m.emissiveMap.value=u.emissiveMap,t(u.emissiveMap,m.emissiveMapTransform)),u.specularMap&&(m.specularMap.value=u.specularMap,t(u.specularMap,m.specularMapTransform)),u.alphaTest>0&&(m.alphaTest.value=u.alphaTest);const M=e.get(u),b=M.envMap,T=M.envMapRotation;b&&(m.envMap.value=b,Bn.copy(T),Bn.x*=-1,Bn.y*=-1,Bn.z*=-1,b.isCubeTexture&&b.isRenderTargetTexture===!1&&(Bn.y*=-1,Bn.z*=-1),m.envMapRotation.value.setFromMatrix4($m.makeRotationFromEuler(Bn)),m.flipEnvMap.value=b.isCubeTexture&&b.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=u.reflectivity,m.ior.value=u.ior,m.refractionRatio.value=u.refractionRatio),u.lightMap&&(m.lightMap.value=u.lightMap,m.lightMapIntensity.value=u.lightMapIntensity,t(u.lightMap,m.lightMapTransform)),u.aoMap&&(m.aoMap.value=u.aoMap,m.aoMapIntensity.value=u.aoMapIntensity,t(u.aoMap,m.aoMapTransform))}function s(m,u){m.diffuse.value.copy(u.color),m.opacity.value=u.opacity,u.map&&(m.map.value=u.map,t(u.map,m.mapTransform))}function o(m,u){m.dashSize.value=u.dashSize,m.totalSize.value=u.dashSize+u.gapSize,m.scale.value=u.scale}function c(m,u,M,b){m.diffuse.value.copy(u.color),m.opacity.value=u.opacity,m.size.value=u.size*M,m.scale.value=b*.5,u.map&&(m.map.value=u.map,t(u.map,m.uvTransform)),u.alphaMap&&(m.alphaMap.value=u.alphaMap,t(u.alphaMap,m.alphaMapTransform)),u.alphaTest>0&&(m.alphaTest.value=u.alphaTest)}function l(m,u){m.diffuse.value.copy(u.color),m.opacity.value=u.opacity,m.rotation.value=u.rotation,u.map&&(m.map.value=u.map,t(u.map,m.mapTransform)),u.alphaMap&&(m.alphaMap.value=u.alphaMap,t(u.alphaMap,m.alphaMapTransform)),u.alphaTest>0&&(m.alphaTest.value=u.alphaTest)}function f(m,u){m.specular.value.copy(u.specular),m.shininess.value=Math.max(u.shininess,1e-4)}function d(m,u){u.gradientMap&&(m.gradientMap.value=u.gradientMap)}function h(m,u){m.metalness.value=u.metalness,u.metalnessMap&&(m.metalnessMap.value=u.metalnessMap,t(u.metalnessMap,m.metalnessMapTransform)),m.roughness.value=u.roughness,u.roughnessMap&&(m.roughnessMap.value=u.roughnessMap,t(u.roughnessMap,m.roughnessMapTransform)),u.envMap&&(m.envMapIntensity.value=u.envMapIntensity)}function p(m,u,M){m.ior.value=u.ior,u.sheen>0&&(m.sheenColor.value.copy(u.sheenColor).multiplyScalar(u.sheen),m.sheenRoughness.value=u.sheenRoughness,u.sheenColorMap&&(m.sheenColorMap.value=u.sheenColorMap,t(u.sheenColorMap,m.sheenColorMapTransform)),u.sheenRoughnessMap&&(m.sheenRoughnessMap.value=u.sheenRoughnessMap,t(u.sheenRoughnessMap,m.sheenRoughnessMapTransform))),u.clearcoat>0&&(m.clearcoat.value=u.clearcoat,m.clearcoatRoughness.value=u.clearcoatRoughness,u.clearcoatMap&&(m.clearcoatMap.value=u.clearcoatMap,t(u.clearcoatMap,m.clearcoatMapTransform)),u.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=u.clearcoatRoughnessMap,t(u.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),u.clearcoatNormalMap&&(m.clearcoatNormalMap.value=u.clearcoatNormalMap,t(u.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(u.clearcoatNormalScale),u.side===wt&&m.clearcoatNormalScale.value.negate())),u.dispersion>0&&(m.dispersion.value=u.dispersion),u.iridescence>0&&(m.iridescence.value=u.iridescence,m.iridescenceIOR.value=u.iridescenceIOR,m.iridescenceThicknessMinimum.value=u.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=u.iridescenceThicknessRange[1],u.iridescenceMap&&(m.iridescenceMap.value=u.iridescenceMap,t(u.iridescenceMap,m.iridescenceMapTransform)),u.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=u.iridescenceThicknessMap,t(u.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),u.transmission>0&&(m.transmission.value=u.transmission,m.transmissionSamplerMap.value=M.texture,m.transmissionSamplerSize.value.set(M.width,M.height),u.transmissionMap&&(m.transmissionMap.value=u.transmissionMap,t(u.transmissionMap,m.transmissionMapTransform)),m.thickness.value=u.thickness,u.thicknessMap&&(m.thicknessMap.value=u.thicknessMap,t(u.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=u.attenuationDistance,m.attenuationColor.value.copy(u.attenuationColor)),u.anisotropy>0&&(m.anisotropyVector.value.set(u.anisotropy*Math.cos(u.anisotropyRotation),u.anisotropy*Math.sin(u.anisotropyRotation)),u.anisotropyMap&&(m.anisotropyMap.value=u.anisotropyMap,t(u.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=u.specularIntensity,m.specularColor.value.copy(u.specularColor),u.specularColorMap&&(m.specularColorMap.value=u.specularColorMap,t(u.specularColorMap,m.specularColorMapTransform)),u.specularIntensityMap&&(m.specularIntensityMap.value=u.specularIntensityMap,t(u.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,u){u.matcap&&(m.matcap.value=u.matcap)}function S(m,u){const M=e.get(u).light;m.referencePosition.value.setFromMatrixPosition(M.matrixWorld),m.nearDistance.value=M.shadow.camera.near,m.farDistance.value=M.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:r}}function Zm(i,e,t,n){let r={},a={},s=[];const o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function c(M,b){const T=b.program;n.uniformBlockBinding(M,T)}function l(M,b){let T=r[M.id];T===void 0&&(g(M),T=f(M),r[M.id]=T,M.addEventListener("dispose",m));const P=b.program;n.updateUBOMapping(M,P);const R=e.render.frame;a[M.id]!==R&&(h(M),a[M.id]=R)}function f(M){const b=d();M.__bindingPointIndex=b;const T=i.createBuffer(),P=M.__size,R=M.usage;return i.bindBuffer(i.UNIFORM_BUFFER,T),i.bufferData(i.UNIFORM_BUFFER,P,R),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,b,T),T}function d(){for(let M=0;M<o;M++)if(s.indexOf(M)===-1)return s.push(M),M;return We("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function h(M){const b=r[M.id],T=M.uniforms,P=M.__cache;i.bindBuffer(i.UNIFORM_BUFFER,b);for(let R=0,L=T.length;R<L;R++){const v=Array.isArray(T[R])?T[R]:[T[R]];for(let E=0,O=v.length;E<O;E++){const w=v[E];if(p(w,R,E,P)===!0){const k=w.__offset,z=Array.isArray(w.value)?w.value:[w.value];let Y=0;for(let V=0;V<z.length;V++){const H=z[V],N=S(H);typeof H=="number"||typeof H=="boolean"?(w.__data[0]=H,i.bufferSubData(i.UNIFORM_BUFFER,k+Y,w.__data)):H.isMatrix3?(w.__data[0]=H.elements[0],w.__data[1]=H.elements[1],w.__data[2]=H.elements[2],w.__data[3]=0,w.__data[4]=H.elements[3],w.__data[5]=H.elements[4],w.__data[6]=H.elements[5],w.__data[7]=0,w.__data[8]=H.elements[6],w.__data[9]=H.elements[7],w.__data[10]=H.elements[8],w.__data[11]=0):(H.toArray(w.__data,Y),Y+=N.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,k,w.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function p(M,b,T,P){const R=M.value,L=b+"_"+T;if(P[L]===void 0)return typeof R=="number"||typeof R=="boolean"?P[L]=R:P[L]=R.clone(),!0;{const v=P[L];if(typeof R=="number"||typeof R=="boolean"){if(v!==R)return P[L]=R,!0}else if(v.equals(R)===!1)return v.copy(R),!0}return!1}function g(M){const b=M.uniforms;let T=0;const P=16;for(let L=0,v=b.length;L<v;L++){const E=Array.isArray(b[L])?b[L]:[b[L]];for(let O=0,w=E.length;O<w;O++){const k=E[O],z=Array.isArray(k.value)?k.value:[k.value];for(let Y=0,V=z.length;Y<V;Y++){const H=z[Y],N=S(H),te=T%P,j=te%N.boundary,he=te+j;T+=j,he!==0&&P-he<N.storage&&(T+=P-he),k.__data=new Float32Array(N.storage/Float32Array.BYTES_PER_ELEMENT),k.__offset=T,T+=N.storage}}}const R=T%P;return R>0&&(T+=P-R),M.__size=T,M.__cache={},this}function S(M){const b={boundary:0,storage:0};return typeof M=="number"||typeof M=="boolean"?(b.boundary=4,b.storage=4):M.isVector2?(b.boundary=8,b.storage=8):M.isVector3||M.isColor?(b.boundary=16,b.storage=12):M.isVector4?(b.boundary=16,b.storage=16):M.isMatrix3?(b.boundary=48,b.storage=48):M.isMatrix4?(b.boundary=64,b.storage=64):M.isTexture?Le("WebGLRenderer: Texture samplers can not be part of an uniforms group."):Le("WebGLRenderer: Unsupported uniform value type.",M),b}function m(M){const b=M.target;b.removeEventListener("dispose",m);const T=s.indexOf(b.__bindingPointIndex);s.splice(T,1),i.deleteBuffer(r[b.id]),delete r[b.id],delete a[b.id]}function u(){for(const M in r)i.deleteBuffer(r[M]);s=[],r={},a={}}return{bind:c,update:l,dispose:u}}const jm=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let $t=null;function Jm(){return $t===null&&($t=new Uu(jm,16,16,mi,gn),$t.name="DFG_LUT",$t.minFilter=bt,$t.magFilter=bt,$t.wrapS=pn,$t.wrapT=pn,$t.generateMipmaps=!1,$t.needsUpdate=!0),$t}class Qm{constructor(e={}){const{canvas:t=du(),context:n=null,depth:r=!0,stencil:a=!1,alpha:s=!1,antialias:o=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:f="default",failIfMajorPerformanceCaveat:d=!1,reversedDepthBuffer:h=!1,outputBufferType:p=It}=e;this.isWebGLRenderer=!0;let g;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");g=n.getContextAttributes().alpha}else g=s;const S=p,m=new Set([Gs,zs,Bs]),u=new Set([It,tn,Ni,Fi,Fs,Os]),M=new Uint32Array(4),b=new Int32Array(4);let T=null,P=null;const R=[],L=[];let v=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Jt,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const E=this;let O=!1;this._outputColorSpace=Ft;let w=0,k=0,z=null,Y=-1,V=null;const H=new ot,N=new ot;let te=null;const j=new Ge(0);let he=0,J=t.width,ie=t.height,Ae=1,ke=null,Ve=null;const X=new ot(0,0,J,ie),ne=new ot(0,0,J,ie);let le=!1;const Ie=new qs;let Re=!1,Ce=!1;const _t=new at,He=new B,Ke=new ot,et={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Fe=!1;function lt(){return z===null?Ae:1}let C=n;function dt(x,U){return t.getContext(x,U)}try{const x={alpha:!0,depth:r,stencil:a,antialias:o,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:f,failIfMajorPerformanceCaveat:d};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Is}`),t.addEventListener("webglcontextlost",ve,!1),t.addEventListener("webglcontextrestored",Pe,!1),t.addEventListener("webglcontextcreationerror",rt,!1),C===null){const U="webgl2";if(C=dt(U,x),C===null)throw dt(U)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(x){throw We("WebGLRenderer: "+x.message),x}let $e,it,Se,y,_,I,K,Z,$,_e,se,be,we,Q,re,ge,xe,fe,Oe,D,oe,ae,me;function ee(){$e=new Qf(C),$e.init(),oe=new Hm(C,$e),it=new Xf(C,$e,e,oe),Se=new Vm(C,$e),it.reversedDepthBuffer&&h&&Se.buffers.depth.setReversed(!0),y=new np(C),_=new Rm,I=new km(C,$e,Se,_,it,oe,y),K=new Jf(E),Z=new sd(C),ae=new Hf(C,Z),$=new ep(C,Z,y,ae),_e=new rp(C,$,Z,ae,y),fe=new ip(C,it,I),re=new qf(_),se=new Am(E,K,$e,it,ae,re),be=new Km(E,_),we=new Cm,Q=new Nm($e),xe=new kf(E,K,Se,_e,g,c),ge=new Gm(E,_e,it),me=new Zm(C,y,it,Se),Oe=new Wf(C,$e,y),D=new tp(C,$e,y),y.programs=se.programs,E.capabilities=it,E.extensions=$e,E.properties=_,E.renderLists=we,E.shadowMap=ge,E.state=Se,E.info=y}ee(),S!==It&&(v=new sp(S,t.width,t.height,r,a));const q=new Ym(E,C);this.xr=q,this.getContext=function(){return C},this.getContextAttributes=function(){return C.getContextAttributes()},this.forceContextLoss=function(){const x=$e.get("WEBGL_lose_context");x&&x.loseContext()},this.forceContextRestore=function(){const x=$e.get("WEBGL_lose_context");x&&x.restoreContext()},this.getPixelRatio=function(){return Ae},this.setPixelRatio=function(x){x!==void 0&&(Ae=x,this.setSize(J,ie,!1))},this.getSize=function(x){return x.set(J,ie)},this.setSize=function(x,U,W=!0){if(q.isPresenting){Le("WebGLRenderer: Can't change size while VR device is presenting.");return}J=x,ie=U,t.width=Math.floor(x*Ae),t.height=Math.floor(U*Ae),W===!0&&(t.style.width=x+"px",t.style.height=U+"px"),v!==null&&v.setSize(t.width,t.height),this.setViewport(0,0,x,U)},this.getDrawingBufferSize=function(x){return x.set(J*Ae,ie*Ae).floor()},this.setDrawingBufferSize=function(x,U,W){J=x,ie=U,Ae=W,t.width=Math.floor(x*W),t.height=Math.floor(U*W),this.setViewport(0,0,x,U)},this.setEffects=function(x){if(S===It){console.error("THREE.WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(x){for(let U=0;U<x.length;U++)if(x[U].isOutputPass===!0){console.warn("THREE.WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}v.setEffects(x||[])},this.getCurrentViewport=function(x){return x.copy(H)},this.getViewport=function(x){return x.copy(X)},this.setViewport=function(x,U,W,G){x.isVector4?X.set(x.x,x.y,x.z,x.w):X.set(x,U,W,G),Se.viewport(H.copy(X).multiplyScalar(Ae).round())},this.getScissor=function(x){return x.copy(ne)},this.setScissor=function(x,U,W,G){x.isVector4?ne.set(x.x,x.y,x.z,x.w):ne.set(x,U,W,G),Se.scissor(N.copy(ne).multiplyScalar(Ae).round())},this.getScissorTest=function(){return le},this.setScissorTest=function(x){Se.setScissorTest(le=x)},this.setOpaqueSort=function(x){ke=x},this.setTransparentSort=function(x){Ve=x},this.getClearColor=function(x){return x.copy(xe.getClearColor())},this.setClearColor=function(){xe.setClearColor(...arguments)},this.getClearAlpha=function(){return xe.getClearAlpha()},this.setClearAlpha=function(){xe.setClearAlpha(...arguments)},this.clear=function(x=!0,U=!0,W=!0){let G=0;if(x){let F=!1;if(z!==null){const ue=z.texture.format;F=m.has(ue)}if(F){const ue=z.texture.type,pe=u.has(ue),de=xe.getClearColor(),Me=xe.getClearAlpha(),ye=de.r,De=de.g,Be=de.b;pe?(M[0]=ye,M[1]=De,M[2]=Be,M[3]=Me,C.clearBufferuiv(C.COLOR,0,M)):(b[0]=ye,b[1]=De,b[2]=Be,b[3]=Me,C.clearBufferiv(C.COLOR,0,b))}else G|=C.COLOR_BUFFER_BIT}U&&(G|=C.DEPTH_BUFFER_BIT),W&&(G|=C.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),G!==0&&C.clear(G)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",ve,!1),t.removeEventListener("webglcontextrestored",Pe,!1),t.removeEventListener("webglcontextcreationerror",rt,!1),xe.dispose(),we.dispose(),Q.dispose(),_.dispose(),K.dispose(),_e.dispose(),ae.dispose(),me.dispose(),se.dispose(),q.dispose(),q.removeEventListener("sessionstart",Zs),q.removeEventListener("sessionend",js),Ln.stop()};function ve(x){x.preventDefault(),bo("WebGLRenderer: Context Lost."),O=!0}function Pe(){bo("WebGLRenderer: Context Restored."),O=!1;const x=y.autoReset,U=ge.enabled,W=ge.autoUpdate,G=ge.needsUpdate,F=ge.type;ee(),y.autoReset=x,ge.enabled=U,ge.autoUpdate=W,ge.needsUpdate=G,ge.type=F}function rt(x){We("WebGLRenderer: A WebGL context could not be created. Reason: ",x.statusMessage)}function Ze(x){const U=x.target;U.removeEventListener("dispose",Ze),an(U)}function an(x){sn(x),_.remove(x)}function sn(x){const U=_.get(x).programs;U!==void 0&&(U.forEach(function(W){se.releaseProgram(W)}),x.isShaderMaterial&&se.releaseShaderCache(x))}this.renderBufferDirect=function(x,U,W,G,F,ue){U===null&&(U=et);const pe=F.isMesh&&F.matrixWorld.determinant()<0,de=pc(x,U,W,G,F);Se.setMaterial(G,pe);let Me=W.index,ye=1;if(G.wireframe===!0){if(Me=$.getWireframeAttribute(W),Me===void 0)return;ye=2}const De=W.drawRange,Be=W.attributes.position;let Te=De.start*ye,Je=(De.start+De.count)*ye;ue!==null&&(Te=Math.max(Te,ue.start*ye),Je=Math.min(Je,(ue.start+ue.count)*ye)),Me!==null?(Te=Math.max(Te,0),Je=Math.min(Je,Me.count)):Be!=null&&(Te=Math.max(Te,0),Je=Math.min(Je,Be.count));const ct=Je-Te;if(ct<0||ct===1/0)return;ae.setup(F,G,de,W,Me);let st,Qe=Oe;if(Me!==null&&(st=Z.get(Me),Qe=D,Qe.setIndex(st)),F.isMesh)G.wireframe===!0?(Se.setLineWidth(G.wireframeLinewidth*lt()),Qe.setMode(C.LINES)):Qe.setMode(C.TRIANGLES);else if(F.isLine){let Et=G.linewidth;Et===void 0&&(Et=1),Se.setLineWidth(Et*lt()),F.isLineSegments?Qe.setMode(C.LINES):F.isLineLoop?Qe.setMode(C.LINE_LOOP):Qe.setMode(C.LINE_STRIP)}else F.isPoints?Qe.setMode(C.POINTS):F.isSprite&&Qe.setMode(C.TRIANGLES);if(F.isBatchedMesh)if(F._multiDrawInstances!==null)Dr("WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),Qe.renderMultiDrawInstances(F._multiDrawStarts,F._multiDrawCounts,F._multiDrawCount,F._multiDrawInstances);else if($e.get("WEBGL_multi_draw"))Qe.renderMultiDraw(F._multiDrawStarts,F._multiDrawCounts,F._multiDrawCount);else{const Et=F._multiDrawStarts,Ee=F._multiDrawCounts,Pt=F._multiDrawCount,qe=Me?Z.get(Me).bytesPerElement:1,Gt=_.get(G).currentProgram.getUniforms();for(let qt=0;qt<Pt;qt++)Gt.setValue(C,"_gl_DrawID",qt),Qe.render(Et[qt]/qe,Ee[qt])}else if(F.isInstancedMesh)Qe.renderInstances(Te,ct,F.count);else if(W.isInstancedBufferGeometry){const Et=W._maxInstanceCount!==void 0?W._maxInstanceCount:1/0,Ee=Math.min(W.instanceCount,Et);Qe.renderInstances(Te,ct,Ee)}else Qe.render(Te,ct)};function Ks(x,U,W){x.transparent===!0&&x.side===hn&&x.forceSinglePass===!1?(x.side=wt,x.needsUpdate=!0,Wi(x,U,W),x.side=Pn,x.needsUpdate=!0,Wi(x,U,W),x.side=hn):Wi(x,U,W)}this.compile=function(x,U,W=null){W===null&&(W=x),P=Q.get(W),P.init(U),L.push(P),W.traverseVisible(function(F){F.isLight&&F.layers.test(U.layers)&&(P.pushLight(F),F.castShadow&&P.pushShadow(F))}),x!==W&&x.traverseVisible(function(F){F.isLight&&F.layers.test(U.layers)&&(P.pushLight(F),F.castShadow&&P.pushShadow(F))}),P.setupLights();const G=new Set;return x.traverse(function(F){if(!(F.isMesh||F.isPoints||F.isLine||F.isSprite))return;const ue=F.material;if(ue)if(Array.isArray(ue))for(let pe=0;pe<ue.length;pe++){const de=ue[pe];Ks(de,W,F),G.add(de)}else Ks(ue,W,F),G.add(ue)}),P=L.pop(),G},this.compileAsync=function(x,U,W=null){const G=this.compile(x,U,W);return new Promise(F=>{function ue(){if(G.forEach(function(pe){_.get(pe).currentProgram.isReady()&&G.delete(pe)}),G.size===0){F(x);return}setTimeout(ue,10)}$e.get("KHR_parallel_shader_compile")!==null?ue():setTimeout(ue,10)})};let kr=null;function fc(x){kr&&kr(x)}function Zs(){Ln.stop()}function js(){Ln.start()}const Ln=new oc;Ln.setAnimationLoop(fc),typeof self<"u"&&Ln.setContext(self),this.setAnimationLoop=function(x){kr=x,q.setAnimationLoop(x),x===null?Ln.stop():Ln.start()},q.addEventListener("sessionstart",Zs),q.addEventListener("sessionend",js),this.render=function(x,U){if(U!==void 0&&U.isCamera!==!0){We("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(O===!0)return;const W=q.enabled===!0&&q.isPresenting===!0,G=v!==null&&(z===null||W)&&v.begin(E,z);if(x.matrixWorldAutoUpdate===!0&&x.updateMatrixWorld(),U.parent===null&&U.matrixWorldAutoUpdate===!0&&U.updateMatrixWorld(),q.enabled===!0&&q.isPresenting===!0&&(v===null||v.isCompositing()===!1)&&(q.cameraAutoUpdate===!0&&q.updateCamera(U),U=q.getCamera()),x.isScene===!0&&x.onBeforeRender(E,x,U,z),P=Q.get(x,L.length),P.init(U),L.push(P),_t.multiplyMatrices(U.projectionMatrix,U.matrixWorldInverse),Ie.setFromProjectionMatrix(_t,jt,U.reversedDepth),Ce=this.localClippingEnabled,Re=re.init(this.clippingPlanes,Ce),T=we.get(x,R.length),T.init(),R.push(T),q.enabled===!0&&q.isPresenting===!0){const pe=E.xr.getDepthSensingMesh();pe!==null&&Hr(pe,U,-1/0,E.sortObjects)}Hr(x,U,0,E.sortObjects),T.finish(),E.sortObjects===!0&&T.sort(ke,Ve),Fe=q.enabled===!1||q.isPresenting===!1||q.hasDepthSensing()===!1,Fe&&xe.addToRenderList(T,x),this.info.render.frame++,Re===!0&&re.beginShadows();const F=P.state.shadowsArray;if(ge.render(F,x,U),Re===!0&&re.endShadows(),this.info.autoReset===!0&&this.info.reset(),(G&&v.hasRenderPass())===!1){const pe=T.opaque,de=T.transmissive;if(P.setupLights(),U.isArrayCamera){const Me=U.cameras;if(de.length>0)for(let ye=0,De=Me.length;ye<De;ye++){const Be=Me[ye];Qs(pe,de,x,Be)}Fe&&xe.render(x);for(let ye=0,De=Me.length;ye<De;ye++){const Be=Me[ye];Js(T,x,Be,Be.viewport)}}else de.length>0&&Qs(pe,de,x,U),Fe&&xe.render(x),Js(T,x,U)}z!==null&&k===0&&(I.updateMultisampleRenderTarget(z),I.updateRenderTargetMipmap(z)),G&&v.end(E),x.isScene===!0&&x.onAfterRender(E,x,U),ae.resetDefaultState(),Y=-1,V=null,L.pop(),L.length>0?(P=L[L.length-1],Re===!0&&re.setGlobalState(E.clippingPlanes,P.state.camera)):P=null,R.pop(),R.length>0?T=R[R.length-1]:T=null};function Hr(x,U,W,G){if(x.visible===!1)return;if(x.layers.test(U.layers)){if(x.isGroup)W=x.renderOrder;else if(x.isLOD)x.autoUpdate===!0&&x.update(U);else if(x.isLight)P.pushLight(x),x.castShadow&&P.pushShadow(x);else if(x.isSprite){if(!x.frustumCulled||Ie.intersectsSprite(x)){G&&Ke.setFromMatrixPosition(x.matrixWorld).applyMatrix4(_t);const pe=_e.update(x),de=x.material;de.visible&&T.push(x,pe,de,W,Ke.z,null)}}else if((x.isMesh||x.isLine||x.isPoints)&&(!x.frustumCulled||Ie.intersectsObject(x))){const pe=_e.update(x),de=x.material;if(G&&(x.boundingSphere!==void 0?(x.boundingSphere===null&&x.computeBoundingSphere(),Ke.copy(x.boundingSphere.center)):(pe.boundingSphere===null&&pe.computeBoundingSphere(),Ke.copy(pe.boundingSphere.center)),Ke.applyMatrix4(x.matrixWorld).applyMatrix4(_t)),Array.isArray(de)){const Me=pe.groups;for(let ye=0,De=Me.length;ye<De;ye++){const Be=Me[ye],Te=de[Be.materialIndex];Te&&Te.visible&&T.push(x,pe,Te,W,Ke.z,Be)}}else de.visible&&T.push(x,pe,de,W,Ke.z,null)}}const ue=x.children;for(let pe=0,de=ue.length;pe<de;pe++)Hr(ue[pe],U,W,G)}function Js(x,U,W,G){const{opaque:F,transmissive:ue,transparent:pe}=x;P.setupLightsView(W),Re===!0&&re.setGlobalState(E.clippingPlanes,W),G&&Se.viewport(H.copy(G)),F.length>0&&Hi(F,U,W),ue.length>0&&Hi(ue,U,W),pe.length>0&&Hi(pe,U,W),Se.buffers.depth.setTest(!0),Se.buffers.depth.setMask(!0),Se.buffers.color.setMask(!0),Se.setPolygonOffset(!1)}function Qs(x,U,W,G){if((W.isScene===!0?W.overrideMaterial:null)!==null)return;if(P.state.transmissionRenderTarget[G.id]===void 0){const Te=$e.has("EXT_color_buffer_half_float")||$e.has("EXT_color_buffer_float");P.state.transmissionRenderTarget[G.id]=new Qt(1,1,{generateMipmaps:!0,type:Te?gn:It,minFilter:Hn,samples:Math.max(4,it.samples),stencilBuffer:a,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Xe.workingColorSpace})}const ue=P.state.transmissionRenderTarget[G.id],pe=G.viewport||H;ue.setSize(pe.z*E.transmissionResolutionScale,pe.w*E.transmissionResolutionScale);const de=E.getRenderTarget(),Me=E.getActiveCubeFace(),ye=E.getActiveMipmapLevel();E.setRenderTarget(ue),E.getClearColor(j),he=E.getClearAlpha(),he<1&&E.setClearColor(16777215,.5),E.clear(),Fe&&xe.render(W);const De=E.toneMapping;E.toneMapping=Jt;const Be=G.viewport;if(G.viewport!==void 0&&(G.viewport=void 0),P.setupLightsView(G),Re===!0&&re.setGlobalState(E.clippingPlanes,G),Hi(x,W,G),I.updateMultisampleRenderTarget(ue),I.updateRenderTargetMipmap(ue),$e.has("WEBGL_multisampled_render_to_texture")===!1){let Te=!1;for(let Je=0,ct=U.length;Je<ct;Je++){const st=U[Je],{object:Qe,geometry:Et,material:Ee,group:Pt}=st;if(Ee.side===hn&&Qe.layers.test(G.layers)){const qe=Ee.side;Ee.side=wt,Ee.needsUpdate=!0,eo(Qe,W,G,Et,Ee,Pt),Ee.side=qe,Ee.needsUpdate=!0,Te=!0}}Te===!0&&(I.updateMultisampleRenderTarget(ue),I.updateRenderTargetMipmap(ue))}E.setRenderTarget(de,Me,ye),E.setClearColor(j,he),Be!==void 0&&(G.viewport=Be),E.toneMapping=De}function Hi(x,U,W){const G=U.isScene===!0?U.overrideMaterial:null;for(let F=0,ue=x.length;F<ue;F++){const pe=x[F],{object:de,geometry:Me,group:ye}=pe;let De=pe.material;De.allowOverride===!0&&G!==null&&(De=G),de.layers.test(W.layers)&&eo(de,U,W,Me,De,ye)}}function eo(x,U,W,G,F,ue){x.onBeforeRender(E,U,W,G,F,ue),x.modelViewMatrix.multiplyMatrices(W.matrixWorldInverse,x.matrixWorld),x.normalMatrix.getNormalMatrix(x.modelViewMatrix),F.onBeforeRender(E,U,W,G,x,ue),F.transparent===!0&&F.side===hn&&F.forceSinglePass===!1?(F.side=wt,F.needsUpdate=!0,E.renderBufferDirect(W,U,G,F,x,ue),F.side=Pn,F.needsUpdate=!0,E.renderBufferDirect(W,U,G,F,x,ue),F.side=hn):E.renderBufferDirect(W,U,G,F,x,ue),x.onAfterRender(E,U,W,G,F,ue)}function Wi(x,U,W){U.isScene!==!0&&(U=et);const G=_.get(x),F=P.state.lights,ue=P.state.shadowsArray,pe=F.state.version,de=se.getParameters(x,F.state,ue,U,W),Me=se.getProgramCacheKey(de);let ye=G.programs;G.environment=x.isMeshStandardMaterial||x.isMeshLambertMaterial||x.isMeshPhongMaterial?U.environment:null,G.fog=U.fog;const De=x.isMeshStandardMaterial||x.isMeshLambertMaterial&&!x.envMap||x.isMeshPhongMaterial&&!x.envMap;G.envMap=K.get(x.envMap||G.environment,De),G.envMapRotation=G.environment!==null&&x.envMap===null?U.environmentRotation:x.envMapRotation,ye===void 0&&(x.addEventListener("dispose",Ze),ye=new Map,G.programs=ye);let Be=ye.get(Me);if(Be!==void 0){if(G.currentProgram===Be&&G.lightsStateVersion===pe)return no(x,de),Be}else de.uniforms=se.getUniforms(x),x.onBeforeCompile(de,E),Be=se.acquireProgram(de,Me),ye.set(Me,Be),G.uniforms=de.uniforms;const Te=G.uniforms;return(!x.isShaderMaterial&&!x.isRawShaderMaterial||x.clipping===!0)&&(Te.clippingPlanes=re.uniform),no(x,de),G.needsLights=_c(x),G.lightsStateVersion=pe,G.needsLights&&(Te.ambientLightColor.value=F.state.ambient,Te.lightProbe.value=F.state.probe,Te.directionalLights.value=F.state.directional,Te.directionalLightShadows.value=F.state.directionalShadow,Te.spotLights.value=F.state.spot,Te.spotLightShadows.value=F.state.spotShadow,Te.rectAreaLights.value=F.state.rectArea,Te.ltc_1.value=F.state.rectAreaLTC1,Te.ltc_2.value=F.state.rectAreaLTC2,Te.pointLights.value=F.state.point,Te.pointLightShadows.value=F.state.pointShadow,Te.hemisphereLights.value=F.state.hemi,Te.directionalShadowMatrix.value=F.state.directionalShadowMatrix,Te.spotLightMatrix.value=F.state.spotLightMatrix,Te.spotLightMap.value=F.state.spotLightMap,Te.pointShadowMatrix.value=F.state.pointShadowMatrix),G.currentProgram=Be,G.uniformsList=null,Be}function to(x){if(x.uniformsList===null){const U=x.currentProgram.getUniforms();x.uniformsList=Ar.seqWithValue(U.seq,x.uniforms)}return x.uniformsList}function no(x,U){const W=_.get(x);W.outputColorSpace=U.outputColorSpace,W.batching=U.batching,W.batchingColor=U.batchingColor,W.instancing=U.instancing,W.instancingColor=U.instancingColor,W.instancingMorph=U.instancingMorph,W.skinning=U.skinning,W.morphTargets=U.morphTargets,W.morphNormals=U.morphNormals,W.morphColors=U.morphColors,W.morphTargetsCount=U.morphTargetsCount,W.numClippingPlanes=U.numClippingPlanes,W.numIntersection=U.numClipIntersection,W.vertexAlphas=U.vertexAlphas,W.vertexTangents=U.vertexTangents,W.toneMapping=U.toneMapping}function pc(x,U,W,G,F){U.isScene!==!0&&(U=et),I.resetTextureUnits();const ue=U.fog,pe=G.isMeshStandardMaterial||G.isMeshLambertMaterial||G.isMeshPhongMaterial?U.environment:null,de=z===null?E.outputColorSpace:z.isXRRenderTarget===!0?z.texture.colorSpace:_i,Me=G.isMeshStandardMaterial||G.isMeshLambertMaterial&&!G.envMap||G.isMeshPhongMaterial&&!G.envMap,ye=K.get(G.envMap||pe,Me),De=G.vertexColors===!0&&!!W.attributes.color&&W.attributes.color.itemSize===4,Be=!!W.attributes.tangent&&(!!G.normalMap||G.anisotropy>0),Te=!!W.morphAttributes.position,Je=!!W.morphAttributes.normal,ct=!!W.morphAttributes.color;let st=Jt;G.toneMapped&&(z===null||z.isXRRenderTarget===!0)&&(st=E.toneMapping);const Qe=W.morphAttributes.position||W.morphAttributes.normal||W.morphAttributes.color,Et=Qe!==void 0?Qe.length:0,Ee=_.get(G),Pt=P.state.lights;if(Re===!0&&(Ce===!0||x!==V)){const gt=x===V&&G.id===Y;re.setState(G,x,gt)}let qe=!1;G.version===Ee.__version?(Ee.needsLights&&Ee.lightsStateVersion!==Pt.state.version||Ee.outputColorSpace!==de||F.isBatchedMesh&&Ee.batching===!1||!F.isBatchedMesh&&Ee.batching===!0||F.isBatchedMesh&&Ee.batchingColor===!0&&F.colorTexture===null||F.isBatchedMesh&&Ee.batchingColor===!1&&F.colorTexture!==null||F.isInstancedMesh&&Ee.instancing===!1||!F.isInstancedMesh&&Ee.instancing===!0||F.isSkinnedMesh&&Ee.skinning===!1||!F.isSkinnedMesh&&Ee.skinning===!0||F.isInstancedMesh&&Ee.instancingColor===!0&&F.instanceColor===null||F.isInstancedMesh&&Ee.instancingColor===!1&&F.instanceColor!==null||F.isInstancedMesh&&Ee.instancingMorph===!0&&F.morphTexture===null||F.isInstancedMesh&&Ee.instancingMorph===!1&&F.morphTexture!==null||Ee.envMap!==ye||G.fog===!0&&Ee.fog!==ue||Ee.numClippingPlanes!==void 0&&(Ee.numClippingPlanes!==re.numPlanes||Ee.numIntersection!==re.numIntersection)||Ee.vertexAlphas!==De||Ee.vertexTangents!==Be||Ee.morphTargets!==Te||Ee.morphNormals!==Je||Ee.morphColors!==ct||Ee.toneMapping!==st||Ee.morphTargetsCount!==Et)&&(qe=!0):(qe=!0,Ee.__version=G.version);let Gt=Ee.currentProgram;qe===!0&&(Gt=Wi(G,U,F));let qt=!1,Dn=!1,qn=!1;const tt=Gt.getUniforms(),xt=Ee.uniforms;if(Se.useProgram(Gt.program)&&(qt=!0,Dn=!0,qn=!0),G.id!==Y&&(Y=G.id,Dn=!0),qt||V!==x){Se.buffers.depth.getReversed()&&x.reversedDepth!==!0&&(x._reversedDepth=!0,x.updateProjectionMatrix()),tt.setValue(C,"projectionMatrix",x.projectionMatrix),tt.setValue(C,"viewMatrix",x.matrixWorldInverse);const Mn=tt.map.cameraPosition;Mn!==void 0&&Mn.setValue(C,He.setFromMatrixPosition(x.matrixWorld)),it.logarithmicDepthBuffer&&tt.setValue(C,"logDepthBufFC",2/(Math.log(x.far+1)/Math.LN2)),(G.isMeshPhongMaterial||G.isMeshToonMaterial||G.isMeshLambertMaterial||G.isMeshBasicMaterial||G.isMeshStandardMaterial||G.isShaderMaterial)&&tt.setValue(C,"isOrthographic",x.isOrthographicCamera===!0),V!==x&&(V=x,Dn=!0,qn=!0)}if(Ee.needsLights&&(Pt.state.directionalShadowMap.length>0&&tt.setValue(C,"directionalShadowMap",Pt.state.directionalShadowMap,I),Pt.state.spotShadowMap.length>0&&tt.setValue(C,"spotShadowMap",Pt.state.spotShadowMap,I),Pt.state.pointShadowMap.length>0&&tt.setValue(C,"pointShadowMap",Pt.state.pointShadowMap,I)),F.isSkinnedMesh){tt.setOptional(C,F,"bindMatrix"),tt.setOptional(C,F,"bindMatrixInverse");const gt=F.skeleton;gt&&(gt.boneTexture===null&&gt.computeBoneTexture(),tt.setValue(C,"boneTexture",gt.boneTexture,I))}F.isBatchedMesh&&(tt.setOptional(C,F,"batchingTexture"),tt.setValue(C,"batchingTexture",F._matricesTexture,I),tt.setOptional(C,F,"batchingIdTexture"),tt.setValue(C,"batchingIdTexture",F._indirectTexture,I),tt.setOptional(C,F,"batchingColorTexture"),F._colorsTexture!==null&&tt.setValue(C,"batchingColorTexture",F._colorsTexture,I));const xn=W.morphAttributes;if((xn.position!==void 0||xn.normal!==void 0||xn.color!==void 0)&&fe.update(F,W,Gt),(Dn||Ee.receiveShadow!==F.receiveShadow)&&(Ee.receiveShadow=F.receiveShadow,tt.setValue(C,"receiveShadow",F.receiveShadow)),(G.isMeshStandardMaterial||G.isMeshLambertMaterial||G.isMeshPhongMaterial)&&G.envMap===null&&U.environment!==null&&(xt.envMapIntensity.value=U.environmentIntensity),xt.dfgLUT!==void 0&&(xt.dfgLUT.value=Jm()),Dn&&(tt.setValue(C,"toneMappingExposure",E.toneMappingExposure),Ee.needsLights&&mc(xt,qn),ue&&G.fog===!0&&be.refreshFogUniforms(xt,ue),be.refreshMaterialUniforms(xt,G,Ae,ie,P.state.transmissionRenderTarget[x.id]),Ar.upload(C,to(Ee),xt,I)),G.isShaderMaterial&&G.uniformsNeedUpdate===!0&&(Ar.upload(C,to(Ee),xt,I),G.uniformsNeedUpdate=!1),G.isSpriteMaterial&&tt.setValue(C,"center",F.center),tt.setValue(C,"modelViewMatrix",F.modelViewMatrix),tt.setValue(C,"normalMatrix",F.normalMatrix),tt.setValue(C,"modelMatrix",F.matrixWorld),G.isShaderMaterial||G.isRawShaderMaterial){const gt=G.uniformsGroups;for(let Mn=0,Yn=gt.length;Mn<Yn;Mn++){const io=gt[Mn];me.update(io,Gt),me.bind(io,Gt)}}return Gt}function mc(x,U){x.ambientLightColor.needsUpdate=U,x.lightProbe.needsUpdate=U,x.directionalLights.needsUpdate=U,x.directionalLightShadows.needsUpdate=U,x.pointLights.needsUpdate=U,x.pointLightShadows.needsUpdate=U,x.spotLights.needsUpdate=U,x.spotLightShadows.needsUpdate=U,x.rectAreaLights.needsUpdate=U,x.hemisphereLights.needsUpdate=U}function _c(x){return x.isMeshLambertMaterial||x.isMeshToonMaterial||x.isMeshPhongMaterial||x.isMeshStandardMaterial||x.isShadowMaterial||x.isShaderMaterial&&x.lights===!0}this.getActiveCubeFace=function(){return w},this.getActiveMipmapLevel=function(){return k},this.getRenderTarget=function(){return z},this.setRenderTargetTextures=function(x,U,W){const G=_.get(x);G.__autoAllocateDepthBuffer=x.resolveDepthBuffer===!1,G.__autoAllocateDepthBuffer===!1&&(G.__useRenderToTexture=!1),_.get(x.texture).__webglTexture=U,_.get(x.depthTexture).__webglTexture=G.__autoAllocateDepthBuffer?void 0:W,G.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(x,U){const W=_.get(x);W.__webglFramebuffer=U,W.__useDefaultFramebuffer=U===void 0};const gc=C.createFramebuffer();this.setRenderTarget=function(x,U=0,W=0){z=x,w=U,k=W;let G=null,F=!1,ue=!1;if(x){const de=_.get(x);if(de.__useDefaultFramebuffer!==void 0){Se.bindFramebuffer(C.FRAMEBUFFER,de.__webglFramebuffer),H.copy(x.viewport),N.copy(x.scissor),te=x.scissorTest,Se.viewport(H),Se.scissor(N),Se.setScissorTest(te),Y=-1;return}else if(de.__webglFramebuffer===void 0)I.setupRenderTarget(x);else if(de.__hasExternalTextures)I.rebindTextures(x,_.get(x.texture).__webglTexture,_.get(x.depthTexture).__webglTexture);else if(x.depthBuffer){const De=x.depthTexture;if(de.__boundDepthTexture!==De){if(De!==null&&_.has(De)&&(x.width!==De.image.width||x.height!==De.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");I.setupDepthRenderbuffer(x)}}const Me=x.texture;(Me.isData3DTexture||Me.isDataArrayTexture||Me.isCompressedArrayTexture)&&(ue=!0);const ye=_.get(x).__webglFramebuffer;x.isWebGLCubeRenderTarget?(Array.isArray(ye[U])?G=ye[U][W]:G=ye[U],F=!0):x.samples>0&&I.useMultisampledRTT(x)===!1?G=_.get(x).__webglMultisampledFramebuffer:Array.isArray(ye)?G=ye[W]:G=ye,H.copy(x.viewport),N.copy(x.scissor),te=x.scissorTest}else H.copy(X).multiplyScalar(Ae).floor(),N.copy(ne).multiplyScalar(Ae).floor(),te=le;if(W!==0&&(G=gc),Se.bindFramebuffer(C.FRAMEBUFFER,G)&&Se.drawBuffers(x,G),Se.viewport(H),Se.scissor(N),Se.setScissorTest(te),F){const de=_.get(x.texture);C.framebufferTexture2D(C.FRAMEBUFFER,C.COLOR_ATTACHMENT0,C.TEXTURE_CUBE_MAP_POSITIVE_X+U,de.__webglTexture,W)}else if(ue){const de=U;for(let Me=0;Me<x.textures.length;Me++){const ye=_.get(x.textures[Me]);C.framebufferTextureLayer(C.FRAMEBUFFER,C.COLOR_ATTACHMENT0+Me,ye.__webglTexture,W,de)}}else if(x!==null&&W!==0){const de=_.get(x.texture);C.framebufferTexture2D(C.FRAMEBUFFER,C.COLOR_ATTACHMENT0,C.TEXTURE_2D,de.__webglTexture,W)}Y=-1},this.readRenderTargetPixels=function(x,U,W,G,F,ue,pe,de=0){if(!(x&&x.isWebGLRenderTarget)){We("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Me=_.get(x).__webglFramebuffer;if(x.isWebGLCubeRenderTarget&&pe!==void 0&&(Me=Me[pe]),Me){Se.bindFramebuffer(C.FRAMEBUFFER,Me);try{const ye=x.textures[de],De=ye.format,Be=ye.type;if(x.textures.length>1&&C.readBuffer(C.COLOR_ATTACHMENT0+de),!it.textureFormatReadable(De)){We("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!it.textureTypeReadable(Be)){We("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}U>=0&&U<=x.width-G&&W>=0&&W<=x.height-F&&C.readPixels(U,W,G,F,oe.convert(De),oe.convert(Be),ue)}finally{const ye=z!==null?_.get(z).__webglFramebuffer:null;Se.bindFramebuffer(C.FRAMEBUFFER,ye)}}},this.readRenderTargetPixelsAsync=async function(x,U,W,G,F,ue,pe,de=0){if(!(x&&x.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Me=_.get(x).__webglFramebuffer;if(x.isWebGLCubeRenderTarget&&pe!==void 0&&(Me=Me[pe]),Me)if(U>=0&&U<=x.width-G&&W>=0&&W<=x.height-F){Se.bindFramebuffer(C.FRAMEBUFFER,Me);const ye=x.textures[de],De=ye.format,Be=ye.type;if(x.textures.length>1&&C.readBuffer(C.COLOR_ATTACHMENT0+de),!it.textureFormatReadable(De))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!it.textureTypeReadable(Be))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Te=C.createBuffer();C.bindBuffer(C.PIXEL_PACK_BUFFER,Te),C.bufferData(C.PIXEL_PACK_BUFFER,ue.byteLength,C.STREAM_READ),C.readPixels(U,W,G,F,oe.convert(De),oe.convert(Be),0);const Je=z!==null?_.get(z).__webglFramebuffer:null;Se.bindFramebuffer(C.FRAMEBUFFER,Je);const ct=C.fenceSync(C.SYNC_GPU_COMMANDS_COMPLETE,0);return C.flush(),await hu(C,ct,4),C.bindBuffer(C.PIXEL_PACK_BUFFER,Te),C.getBufferSubData(C.PIXEL_PACK_BUFFER,0,ue),C.deleteBuffer(Te),C.deleteSync(ct),ue}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(x,U=null,W=0){const G=Math.pow(2,-W),F=Math.floor(x.image.width*G),ue=Math.floor(x.image.height*G),pe=U!==null?U.x:0,de=U!==null?U.y:0;I.setTexture2D(x,0),C.copyTexSubImage2D(C.TEXTURE_2D,W,0,0,pe,de,F,ue),Se.unbindTexture()};const vc=C.createFramebuffer(),xc=C.createFramebuffer();this.copyTextureToTexture=function(x,U,W=null,G=null,F=0,ue=0){let pe,de,Me,ye,De,Be,Te,Je,ct;const st=x.isCompressedTexture?x.mipmaps[ue]:x.image;if(W!==null)pe=W.max.x-W.min.x,de=W.max.y-W.min.y,Me=W.isBox3?W.max.z-W.min.z:1,ye=W.min.x,De=W.min.y,Be=W.isBox3?W.min.z:0;else{const xt=Math.pow(2,-F);pe=Math.floor(st.width*xt),de=Math.floor(st.height*xt),x.isDataArrayTexture?Me=st.depth:x.isData3DTexture?Me=Math.floor(st.depth*xt):Me=1,ye=0,De=0,Be=0}G!==null?(Te=G.x,Je=G.y,ct=G.z):(Te=0,Je=0,ct=0);const Qe=oe.convert(U.format),Et=oe.convert(U.type);let Ee;U.isData3DTexture?(I.setTexture3D(U,0),Ee=C.TEXTURE_3D):U.isDataArrayTexture||U.isCompressedArrayTexture?(I.setTexture2DArray(U,0),Ee=C.TEXTURE_2D_ARRAY):(I.setTexture2D(U,0),Ee=C.TEXTURE_2D),C.pixelStorei(C.UNPACK_FLIP_Y_WEBGL,U.flipY),C.pixelStorei(C.UNPACK_PREMULTIPLY_ALPHA_WEBGL,U.premultiplyAlpha),C.pixelStorei(C.UNPACK_ALIGNMENT,U.unpackAlignment);const Pt=C.getParameter(C.UNPACK_ROW_LENGTH),qe=C.getParameter(C.UNPACK_IMAGE_HEIGHT),Gt=C.getParameter(C.UNPACK_SKIP_PIXELS),qt=C.getParameter(C.UNPACK_SKIP_ROWS),Dn=C.getParameter(C.UNPACK_SKIP_IMAGES);C.pixelStorei(C.UNPACK_ROW_LENGTH,st.width),C.pixelStorei(C.UNPACK_IMAGE_HEIGHT,st.height),C.pixelStorei(C.UNPACK_SKIP_PIXELS,ye),C.pixelStorei(C.UNPACK_SKIP_ROWS,De),C.pixelStorei(C.UNPACK_SKIP_IMAGES,Be);const qn=x.isDataArrayTexture||x.isData3DTexture,tt=U.isDataArrayTexture||U.isData3DTexture;if(x.isDepthTexture){const xt=_.get(x),xn=_.get(U),gt=_.get(xt.__renderTarget),Mn=_.get(xn.__renderTarget);Se.bindFramebuffer(C.READ_FRAMEBUFFER,gt.__webglFramebuffer),Se.bindFramebuffer(C.DRAW_FRAMEBUFFER,Mn.__webglFramebuffer);for(let Yn=0;Yn<Me;Yn++)qn&&(C.framebufferTextureLayer(C.READ_FRAMEBUFFER,C.COLOR_ATTACHMENT0,_.get(x).__webglTexture,F,Be+Yn),C.framebufferTextureLayer(C.DRAW_FRAMEBUFFER,C.COLOR_ATTACHMENT0,_.get(U).__webglTexture,ue,ct+Yn)),C.blitFramebuffer(ye,De,pe,de,Te,Je,pe,de,C.DEPTH_BUFFER_BIT,C.NEAREST);Se.bindFramebuffer(C.READ_FRAMEBUFFER,null),Se.bindFramebuffer(C.DRAW_FRAMEBUFFER,null)}else if(F!==0||x.isRenderTargetTexture||_.has(x)){const xt=_.get(x),xn=_.get(U);Se.bindFramebuffer(C.READ_FRAMEBUFFER,vc),Se.bindFramebuffer(C.DRAW_FRAMEBUFFER,xc);for(let gt=0;gt<Me;gt++)qn?C.framebufferTextureLayer(C.READ_FRAMEBUFFER,C.COLOR_ATTACHMENT0,xt.__webglTexture,F,Be+gt):C.framebufferTexture2D(C.READ_FRAMEBUFFER,C.COLOR_ATTACHMENT0,C.TEXTURE_2D,xt.__webglTexture,F),tt?C.framebufferTextureLayer(C.DRAW_FRAMEBUFFER,C.COLOR_ATTACHMENT0,xn.__webglTexture,ue,ct+gt):C.framebufferTexture2D(C.DRAW_FRAMEBUFFER,C.COLOR_ATTACHMENT0,C.TEXTURE_2D,xn.__webglTexture,ue),F!==0?C.blitFramebuffer(ye,De,pe,de,Te,Je,pe,de,C.COLOR_BUFFER_BIT,C.NEAREST):tt?C.copyTexSubImage3D(Ee,ue,Te,Je,ct+gt,ye,De,pe,de):C.copyTexSubImage2D(Ee,ue,Te,Je,ye,De,pe,de);Se.bindFramebuffer(C.READ_FRAMEBUFFER,null),Se.bindFramebuffer(C.DRAW_FRAMEBUFFER,null)}else tt?x.isDataTexture||x.isData3DTexture?C.texSubImage3D(Ee,ue,Te,Je,ct,pe,de,Me,Qe,Et,st.data):U.isCompressedArrayTexture?C.compressedTexSubImage3D(Ee,ue,Te,Je,ct,pe,de,Me,Qe,st.data):C.texSubImage3D(Ee,ue,Te,Je,ct,pe,de,Me,Qe,Et,st):x.isDataTexture?C.texSubImage2D(C.TEXTURE_2D,ue,Te,Je,pe,de,Qe,Et,st.data):x.isCompressedTexture?C.compressedTexSubImage2D(C.TEXTURE_2D,ue,Te,Je,st.width,st.height,Qe,st.data):C.texSubImage2D(C.TEXTURE_2D,ue,Te,Je,pe,de,Qe,Et,st);C.pixelStorei(C.UNPACK_ROW_LENGTH,Pt),C.pixelStorei(C.UNPACK_IMAGE_HEIGHT,qe),C.pixelStorei(C.UNPACK_SKIP_PIXELS,Gt),C.pixelStorei(C.UNPACK_SKIP_ROWS,qt),C.pixelStorei(C.UNPACK_SKIP_IMAGES,Dn),ue===0&&U.generateMipmaps&&C.generateMipmap(Ee),Se.unbindTexture()},this.initRenderTarget=function(x){_.get(x).__webglFramebuffer===void 0&&I.setupRenderTarget(x)},this.initTexture=function(x){x.isCubeTexture?I.setTextureCube(x,0):x.isData3DTexture?I.setTexture3D(x,0):x.isDataArrayTexture||x.isCompressedArrayTexture?I.setTexture2DArray(x,0):I.setTexture2D(x,0),Se.unbindTexture()},this.resetState=function(){w=0,k=0,z=null,Se.reset(),ae.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return jt}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=Xe._getDrawingBufferColorSpace(e),t.unpackColorSpace=Xe._getUnpackColorSpace()}}function bs(i){return i>=86?"CATASTROPHIC":i>=76?"EXTREME":i>=66?"SEVERE":i>=56?"STORMY":i>=46?"CLOUDY":"CLEAR"}function As(i){switch(i){case"CATASTROPHIC":return"#ef4444";case"EXTREME":return"#f97316";case"SEVERE":return"#eab308";case"STORMY":return"#a855f7";case"CLOUDY":return"#3b82f6";case"CLEAR":return"#22c55e"}}const ci=[{code:"SY",name:"Syria",cii:94,flag:"🇸🇾",lat:34.8,lng:38.99},{code:"AF",name:"Afghanistan",cii:93,flag:"🇦🇫",lat:33.93,lng:67.71},{code:"YE",name:"Yemen",cii:92,flag:"🇾🇪",lat:15.55,lng:48.52},{code:"SO",name:"Somalia",cii:91,flag:"🇸🇴",lat:5.15,lng:46.2},{code:"SS",name:"South Sudan",cii:90,flag:"🇸🇸",lat:6.88,lng:31.31},{code:"SD",name:"Sudan",cii:89,flag:"🇸🇩",lat:12.86,lng:30.22},{code:"MM",name:"Myanmar",cii:88,flag:"🇲🇲",lat:21.91,lng:95.96},{code:"UA",name:"Ukraine",cii:87,flag:"🇺🇦",lat:48.38,lng:31.17},{code:"LY",name:"Libya",cii:86,flag:"🇱🇾",lat:26.34,lng:17.23},{code:"IQ",name:"Iraq",cii:85,flag:"🇮🇶",lat:33.22,lng:43.68},{code:"CD",name:"DR Congo",cii:84,flag:"🇨🇩",lat:-4.04,lng:21.76},{code:"CF",name:"Central African Rep.",cii:83,flag:"🇨🇫",lat:6.61,lng:20.94},{code:"HT",name:"Haiti",cii:82,flag:"🇭🇹",lat:18.97,lng:-72.29},{code:"ML",name:"Mali",cii:81,flag:"🇲🇱",lat:17.57,lng:-4},{code:"BF",name:"Burkina Faso",cii:80,flag:"🇧🇫",lat:12.24,lng:-1.56},{code:"PS",name:"Palestine",cii:79,flag:"🇵🇸",lat:31.95,lng:35.23},{code:"ER",name:"Eritrea",cii:78,flag:"🇪🇷",lat:15.18,lng:39.78},{code:"NE",name:"Niger",cii:77,flag:"🇳🇪",lat:17.61,lng:8.08},{code:"TD",name:"Chad",cii:76,flag:"🇹🇩",lat:15.45,lng:18.73},{code:"KP",name:"North Korea",cii:75,flag:"🇰🇵",lat:40.34,lng:127.51},{code:"VE",name:"Venezuela",cii:74,flag:"🇻🇪",lat:6.42,lng:-66.59},{code:"NG",name:"Nigeria",cii:73,flag:"🇳🇬",lat:9.08,lng:7.49},{code:"ET",name:"Ethiopia",cii:72,flag:"🇪🇹",lat:9.15,lng:40.49},{code:"PK",name:"Pakistan",cii:71,flag:"🇵🇰",lat:30.38,lng:69.35},{code:"LB",name:"Lebanon",cii:70,flag:"🇱🇧",lat:33.85,lng:35.86},{code:"MZ",name:"Mozambique",cii:69,flag:"🇲🇿",lat:-18.67,lng:35.53},{code:"CM",name:"Cameroon",cii:68,flag:"🇨🇲",lat:7.37,lng:12.35},{code:"CG",name:"Congo",cii:67,flag:"🇨🇬",lat:-.23,lng:15.83},{code:"BI",name:"Burundi",cii:66,flag:"🇧🇮",lat:-3.37,lng:29.92},{code:"IR",name:"Iran",cii:65,flag:"🇮🇷",lat:32.43,lng:53.69},{code:"RU",name:"Russia",cii:64,flag:"🇷🇺",lat:61.52,lng:105.32},{code:"IL",name:"Israel",cii:63,flag:"🇮🇱",lat:31.05,lng:34.85},{code:"EG",name:"Egypt",cii:62,flag:"🇪🇬",lat:26.82,lng:30.8},{code:"CO",name:"Colombia",cii:61,flag:"🇨🇴",lat:4.57,lng:-74.3},{code:"ZW",name:"Zimbabwe",cii:60,flag:"🇿🇼",lat:-19.02,lng:29.15},{code:"TN",name:"Tunisia",cii:59,flag:"🇹🇳",lat:33.89,lng:9.54},{code:"BD",name:"Bangladesh",cii:58,flag:"🇧🇩",lat:23.68,lng:90.36},{code:"NI",name:"Nicaragua",cii:57,flag:"🇳🇮",lat:12.87,lng:-85.21},{code:"BY",name:"Belarus",cii:56,flag:"🇧🇾",lat:53.71,lng:27.95},{code:"TR",name:"Turkey",cii:55,flag:"🇹🇷",lat:38.96,lng:35.24},{code:"CN",name:"China",cii:54,flag:"🇨🇳",lat:35.86,lng:104.2},{code:"SA",name:"Saudi Arabia",cii:53,flag:"🇸🇦",lat:23.89,lng:45.08},{code:"IN",name:"India",cii:52,flag:"🇮🇳",lat:20.59,lng:78.96},{code:"TH",name:"Thailand",cii:51,flag:"🇹🇭",lat:15.87,lng:100.99},{code:"PH",name:"Philippines",cii:50,flag:"🇵🇭",lat:12.88,lng:121.77},{code:"MX",name:"Mexico",cii:49,flag:"🇲🇽",lat:23.63,lng:-102.55},{code:"KE",name:"Kenya",cii:48,flag:"🇰🇪",lat:-.02,lng:37.91},{code:"DZ",name:"Algeria",cii:47,flag:"🇩🇿",lat:28.03,lng:1.66},{code:"UG",name:"Uganda",cii:46,flag:"🇺🇬",lat:1.37,lng:32.29},{code:"US",name:"United States",cii:32,flag:"🇺🇸",lat:37.09,lng:-95.71},{code:"GB",name:"United Kingdom",cii:22,flag:"🇬🇧",lat:55.38,lng:-3.44},{code:"FR",name:"France",cii:28,flag:"🇫🇷",lat:46.23,lng:2.21},{code:"DE",name:"Germany",cii:20,flag:"🇩🇪",lat:51.17,lng:10.45},{code:"JP",name:"Japan",cii:18,flag:"🇯🇵",lat:36.2,lng:138.25},{code:"KR",name:"South Korea",cii:38,flag:"🇰🇷",lat:35.91,lng:127.77},{code:"AU",name:"Australia",cii:15,flag:"🇦🇺",lat:-25.27,lng:133.78},{code:"CA",name:"Canada",cii:14,flag:"🇨🇦",lat:56.13,lng:-106.35},{code:"BR",name:"Brazil",cii:42,flag:"🇧🇷",lat:-14.24,lng:-51.93},{code:"AR",name:"Argentina",cii:44,flag:"🇦🇷",lat:-38.42,lng:-63.62},{code:"IT",name:"Italy",cii:25,flag:"🇮🇹",lat:41.87,lng:12.57},{code:"ES",name:"Spain",cii:23,flag:"🇪🇸",lat:40.46,lng:-3.75},{code:"PT",name:"Portugal",cii:16,flag:"🇵🇹",lat:39.4,lng:-8.22},{code:"NL",name:"Netherlands",cii:13,flag:"🇳🇱",lat:52.13,lng:5.29},{code:"BE",name:"Belgium",cii:17,flag:"🇧🇪",lat:50.5,lng:4.47},{code:"CH",name:"Switzerland",cii:8,flag:"🇨🇭",lat:46.82,lng:8.23},{code:"AT",name:"Austria",cii:12,flag:"🇦🇹",lat:47.52,lng:14.55},{code:"SE",name:"Sweden",cii:11,flag:"🇸🇪",lat:60.13,lng:18.64},{code:"NO",name:"Norway",cii:9,flag:"🇳🇴",lat:60.47,lng:8.47},{code:"FI",name:"Finland",cii:10,flag:"🇫🇮",lat:61.92,lng:25.75},{code:"DK",name:"Denmark",cii:11,flag:"🇩🇰",lat:56.26,lng:9.5},{code:"IE",name:"Ireland",cii:12,flag:"🇮🇪",lat:53.14,lng:-7.69},{code:"PL",name:"Poland",cii:24,flag:"🇵🇱",lat:51.92,lng:19.15},{code:"CZ",name:"Czech Republic",cii:15,flag:"🇨🇿",lat:49.82,lng:15.47},{code:"RO",name:"Romania",cii:30,flag:"🇷🇴",lat:45.94,lng:24.97},{code:"HU",name:"Hungary",cii:35,flag:"🇭🇺",lat:47.16,lng:19.5},{code:"GR",name:"Greece",cii:33,flag:"🇬🇷",lat:39.07,lng:21.82},{code:"HR",name:"Croatia",cii:19,flag:"🇭🇷",lat:45.1,lng:15.2},{code:"RS",name:"Serbia",cii:40,flag:"🇷🇸",lat:44.02,lng:21.01},{code:"BA",name:"Bosnia & Herzegovina",cii:42,flag:"🇧🇦",lat:43.92,lng:17.68},{code:"AL",name:"Albania",cii:38,flag:"🇦🇱",lat:41.15,lng:20.17},{code:"BG",name:"Bulgaria",cii:28,flag:"🇧🇬",lat:42.73,lng:25.49},{code:"SK",name:"Slovakia",cii:22,flag:"🇸🇰",lat:48.67,lng:19.7},{code:"SI",name:"Slovenia",cii:14,flag:"🇸🇮",lat:46.15,lng:14.99},{code:"EE",name:"Estonia",cii:16,flag:"🇪🇪",lat:58.6,lng:25.01},{code:"LV",name:"Latvia",cii:18,flag:"🇱🇻",lat:56.88,lng:24.6},{code:"LT",name:"Lithuania",cii:17,flag:"🇱🇹",lat:55.17,lng:23.88},{code:"GE",name:"Georgia",cii:45,flag:"🇬🇪",lat:42.32,lng:43.36},{code:"AM",name:"Armenia",cii:44,flag:"🇦🇲",lat:40.07,lng:45.04},{code:"AZ",name:"Azerbaijan",cii:43,flag:"🇦🇿",lat:40.14,lng:47.58},{code:"KZ",name:"Kazakhstan",cii:39,flag:"🇰🇿",lat:48.02,lng:66.92},{code:"UZ",name:"Uzbekistan",cii:41,flag:"🇺🇿",lat:41.38,lng:64.59},{code:"TM",name:"Turkmenistan",cii:44,flag:"🇹🇲",lat:38.97,lng:59.56},{code:"KG",name:"Kyrgyzstan",cii:42,flag:"🇰🇬",lat:41.2,lng:74.77},{code:"TJ",name:"Tajikistan",cii:45,flag:"🇹🇯",lat:38.86,lng:71.28},{code:"NZ",name:"New Zealand",cii:10,flag:"🇳🇿",lat:-40.9,lng:174.89},{code:"SG",name:"Singapore",cii:12,flag:"🇸🇬",lat:1.35,lng:103.82},{code:"MY",name:"Malaysia",cii:34,flag:"🇲🇾",lat:4.21,lng:101.98},{code:"ID",name:"Indonesia",cii:40,flag:"🇮🇩",lat:-.79,lng:113.92},{code:"VN",name:"Vietnam",cii:36,flag:"🇻🇳",lat:14.06,lng:108.28},{code:"TW",name:"Taiwan",cii:42,flag:"🇹🇼",lat:23.7,lng:120.96},{code:"AE",name:"UAE",cii:26,flag:"🇦🇪",lat:23.42,lng:53.85},{code:"QA",name:"Qatar",cii:24,flag:"🇶🇦",lat:25.35,lng:51.18},{code:"KW",name:"Kuwait",cii:30,flag:"🇰🇼",lat:29.31,lng:47.48},{code:"OM",name:"Oman",cii:22,flag:"🇴🇲",lat:21.51,lng:55.92},{code:"BH",name:"Bahrain",cii:32,flag:"🇧🇭",lat:26.07,lng:50.56},{code:"JO",name:"Jordan",cii:44,flag:"🇯🇴",lat:30.59,lng:36.24},{code:"MA",name:"Morocco",cii:35,flag:"🇲🇦",lat:31.79,lng:-7.09},{code:"GH",name:"Ghana",cii:33,flag:"🇬🇭",lat:7.95,lng:-1.02},{code:"SN",name:"Senegal",cii:34,flag:"🇸🇳",lat:14.5,lng:-14.45},{code:"TZ",name:"Tanzania",cii:36,flag:"🇹🇿",lat:-6.37,lng:34.89},{code:"ZA",name:"South Africa",cii:44,flag:"🇿🇦",lat:-30.56,lng:22.94},{code:"AO",name:"Angola",cii:45,flag:"🇦🇴",lat:-11.2,lng:17.87},{code:"CL",name:"Chile",cii:28,flag:"🇨🇱",lat:-35.68,lng:-71.54},{code:"PE",name:"Peru",cii:42,flag:"🇵🇪",lat:-9.19,lng:-75.02},{code:"EC",name:"Ecuador",cii:45,flag:"🇪🇨",lat:-1.83,lng:-78.18},{code:"BO",name:"Bolivia",cii:43,flag:"🇧🇴",lat:-16.29,lng:-63.59},{code:"UY",name:"Uruguay",cii:18,flag:"🇺🇾",lat:-32.52,lng:-55.77},{code:"PY",name:"Paraguay",cii:35,flag:"🇵🇾",lat:-23.44,lng:-58.44},{code:"CU",name:"Cuba",cii:55,flag:"🇨🇺",lat:21.52,lng:-77.78},{code:"DO",name:"Dominican Republic",cii:34,flag:"🇩🇴",lat:18.74,lng:-70.16},{code:"GT",name:"Guatemala",cii:44,flag:"🇬🇹",lat:15.78,lng:-90.23},{code:"HN",name:"Honduras",cii:45,flag:"🇭🇳",lat:15.2,lng:-86.24},{code:"SV",name:"El Salvador",cii:40,flag:"🇸🇻",lat:13.79,lng:-88.9},{code:"PA",name:"Panama",cii:30,flag:"🇵🇦",lat:8.54,lng:-80.78},{code:"CR",name:"Costa Rica",cii:20,flag:"🇨🇷",lat:9.75,lng:-83.75},{code:"JM",name:"Jamaica",cii:38,flag:"🇯🇲",lat:18.11,lng:-77.3},{code:"TT",name:"Trinidad & Tobago",cii:32,flag:"🇹🇹",lat:10.69,lng:-61.22},{code:"IS",name:"Iceland",cii:6,flag:"🇮🇸",lat:64.96,lng:-19.02},{code:"LU",name:"Luxembourg",cii:8,flag:"🇱🇺",lat:49.82,lng:6.13},{code:"MT",name:"Malta",cii:14,flag:"🇲🇹",lat:35.94,lng:14.38},{code:"CY",name:"Cyprus",cii:28,flag:"🇨🇾",lat:35.13,lng:33.43},{code:"MD",name:"Moldova",cii:44,flag:"🇲🇩",lat:47.41,lng:28.37},{code:"MN",name:"Mongolia",cii:32,flag:"🇲🇳",lat:46.86,lng:103.85},{code:"NP",name:"Nepal",cii:42,flag:"🇳🇵",lat:28.39,lng:84.12},{code:"LK",name:"Sri Lanka",cii:44,flag:"🇱🇰",lat:7.87,lng:80.77},{code:"LA",name:"Laos",cii:38,flag:"🇱🇦",lat:19.86,lng:102.5},{code:"KH",name:"Cambodia",cii:40,flag:"🇰🇭",lat:12.57,lng:104.99},{code:"FJ",name:"Fiji",cii:26,flag:"🇫🇯",lat:-17.71,lng:178.07},{code:"PG",name:"Papua New Guinea",cii:44,flag:"🇵🇬",lat:-6.31,lng:143.96},{code:"MW",name:"Malawi",cii:42,flag:"🇲🇼",lat:-13.25,lng:34.3},{code:"ZM",name:"Zambia",cii:38,flag:"🇿🇲",lat:-13.13,lng:27.85},{code:"BW",name:"Botswana",cii:22,flag:"🇧🇼",lat:-22.33,lng:24.68},{code:"NA",name:"Namibia",cii:24,flag:"🇳🇦",lat:-22.96,lng:18.49},{code:"MG",name:"Madagascar",cii:40,flag:"🇲🇬",lat:-18.77,lng:46.87},{code:"RW",name:"Rwanda",cii:36,flag:"🇷🇼",lat:-1.94,lng:29.87},{code:"CI",name:"Cote d'Ivoire",cii:42,flag:"🇨🇮",lat:7.54,lng:-5.55},{code:"GN",name:"Guinea",cii:45,flag:"🇬🇳",lat:9.95,lng:-9.7},{code:"SL",name:"Sierra Leone",cii:44,flag:"🇸🇱",lat:8.46,lng:-11.78},{code:"LR",name:"Liberia",cii:43,flag:"🇱🇷",lat:6.43,lng:-9.43},{code:"TG",name:"Togo",cii:40,flag:"🇹🇬",lat:8.62,lng:.82},{code:"BJ",name:"Benin",cii:38,flag:"🇧🇯",lat:9.31,lng:2.32},{code:"GM",name:"Gambia",cii:36,flag:"🇬🇲",lat:13.44,lng:-15.31},{code:"MR",name:"Mauritania",cii:44,flag:"🇲🇷",lat:21.01,lng:-10.94},{code:"DJ",name:"Djibouti",cii:42,flag:"🇩🇯",lat:11.83,lng:42.59},{code:"GA",name:"Gabon",cii:36,flag:"🇬🇦",lat:-.8,lng:11.61},{code:"GQ",name:"Equatorial Guinea",cii:44,flag:"🇬🇶",lat:1.65,lng:10.27},{code:"MU",name:"Mauritius",cii:18,flag:"🇲🇺",lat:-20.35,lng:57.55},{code:"SC",name:"Seychelles",cii:16,flag:"🇸🇨",lat:-4.68,lng:55.49},{code:"CV",name:"Cape Verde",cii:18,flag:"🇨🇻",lat:16,lng:-24.01}];function e_(){return ci.filter(i=>i.cii>=76).sort((i,e)=>e.cii-i.cii)}function t_(){const i=ci.filter(n=>n.cii>=76).length,e=ci.filter(n=>n.cii>=56&&n.cii<76).length,t=ci.filter(n=>n.cii<56).length;return{critical:i,highRisk:e,stable:t,total:ci.length}}function n_(i,e,t){const n=(90-i)*(Math.PI/180),r=(e+180)*(Math.PI/180);return new B(-(t*Math.sin(n)*Math.cos(r)),t*Math.cos(n),t*Math.sin(n)*Math.sin(r))}function i_(){const i=new zt,e=[];for(let n=0;n<6e3;n++){const r=(Math.random()-.5)*2e3,a=(Math.random()-.5)*2e3,s=(Math.random()-.5)*2e3;Math.sqrt(r*r+a*a+s*s)>200&&e.push(r,a,s)}i.setAttribute("position",new Ut(e,3));const t=new tc({color:16777215,size:.7,sizeAttenuation:!0,transparent:!0,opacity:.8});return new Bu(i,t)}function r_({onCountryClick:i,selectedCountry:e}){const t=qi(null),n=qi(null),r=qi(null),a=qi(i);a.current=i;const s=Ui(()=>{const o=r.current,c=t.current;if(!o||!c)return;const l=c.clientWidth,f=c.clientHeight;o.camera.aspect=l/f,o.camera.updateProjectionMatrix(),o.renderer.setSize(l,f)},[]);return Ds(()=>{const o=t.current;if(!o)return;const c=o.clientWidth,l=o.clientHeight,f=new Qm({antialias:!0,alpha:!0});f.setSize(c,l),f.setPixelRatio(Math.min(window.devicePixelRatio,2)),f.setClearColor(394766,1),o.appendChild(f.domElement);const d=new wu,h=new Ot(45,c/l,.1,2e3);h.position.z=300,d.add(i_());const p=new td(4473958,1.5);d.add(p);const g=new ed(16777215,1.2);g.position.set(5,3,5),d.add(g);const S=100,m=new Li(S,64,64),M=new ju().load("/textures/earth-blue-marble.jpg"),b=new Xu({map:M,shininess:15,specular:new Ge(1118498)}),T=new Bt(m,b);d.add(T);const P=new Li(S*1.02,64,64),R=new Ir({color:35071,transparent:!0,opacity:.06,side:wt}),L=new Bt(P,R);d.add(L);const v=[],E=new Li(1,12,12);for(const J of ci){const ie=bs(J.cii),Ae=As(ie),ke=J.cii>=76?1.8:J.cii>=56?1.4:1,Ve=new Ir({color:new Ge(Ae),transparent:!0,opacity:.9}),X=new Bt(E,Ve),ne=n_(J.lat,J.lng,S+1.2);X.position.copy(ne),X.scale.setScalar(ke),T.add(X),v.push({mesh:X,country:J,baseScale:ke})}const O={renderer:f,scene:d,camera:h,globe:T,markers:v,autoRotate:!0,isDragging:!1,mouseDown:null,rotation:{x:.3,y:0},targetRotation:{x:.3,y:0},animId:0};r.current=O;const w=new rd,k=new Ye;let z=null;function Y(J){const ie=f.domElement.getBoundingClientRect();k.x=(J.clientX-ie.left)/ie.width*2-1,k.y=-((J.clientY-ie.top)/ie.height)*2+1,w.setFromCamera(k,h);const Ae=v.map(Ve=>Ve.mesh),ke=w.intersectObjects(Ae);return ke.length>0&&v.find(Ve=>Ve.mesh===ke[0].object)||null}function V(J){O.mouseDown={x:J.clientX,y:J.clientY},O.isDragging=!1}function H(J){var ke,Ve;if(O.mouseDown){const X=J.clientX-O.mouseDown.x,ne=J.clientY-O.mouseDown.y;(Math.abs(X)>3||Math.abs(ne)>3)&&(O.isDragging=!0,O.autoRotate=!1,O.targetRotation.y+=X*.005,O.targetRotation.x+=ne*.003,O.targetRotation.x=Math.max(-1.2,Math.min(1.2,O.targetRotation.x)),O.mouseDown={x:J.clientX,y:J.clientY})}const ie=Y(J),Ae=n.current;if(ie&&Ae){const X=ie.country,ne=bs(X.cii);Ae.innerHTML=`<strong>${X.flag} ${X.name}</strong><br/>CII: ${X.cii} — ${ne}`,Ae.style.display="block",Ae.style.left=`${J.clientX-(((ke=t.current)==null?void 0:ke.getBoundingClientRect().left)||0)+12}px`,Ae.style.top=`${J.clientY-(((Ve=t.current)==null?void 0:Ve.getBoundingClientRect().top)||0)-10}px`,f.domElement.style.cursor="pointer",z&&z!==ie&&z.mesh.scale.setScalar(z.baseScale),ie.mesh.scale.setScalar(ie.baseScale*1.6),z=ie}else Ae&&(Ae.style.display="none"),f.domElement.style.cursor="grab",z&&(z.mesh.scale.setScalar(z.baseScale),z=null)}function N(J){if(!O.isDragging&&O.mouseDown){const ie=Y(J);ie&&a.current(ie.country)}O.mouseDown=null,O.isDragging&&setTimeout(()=>{O.autoRotate=!0},4e3),O.isDragging=!1}function te(J){J.preventDefault(),h.position.z=Math.max(160,Math.min(500,h.position.z+J.deltaY*.3))}f.domElement.addEventListener("mousedown",V),f.domElement.addEventListener("mousemove",H),f.domElement.addEventListener("mouseup",N),f.domElement.addEventListener("wheel",te,{passive:!1}),window.addEventListener("resize",s);let j=0;function he(){O.animId=requestAnimationFrame(he),j+=.02,O.autoRotate&&(O.targetRotation.y+=.001),O.rotation.x+=(O.targetRotation.x-O.rotation.x)*.05,O.rotation.y+=(O.targetRotation.y-O.rotation.y)*.05,T.rotation.x=O.rotation.x,T.rotation.y=O.rotation.y;for(const J of v)if(J.country.cii>=76){const ie=1+Math.sin(j*2)*.2;J!==z&&J.mesh.scale.setScalar(J.baseScale*ie)}f.render(d,h)}return he(),()=>{cancelAnimationFrame(O.animId),f.domElement.removeEventListener("mousedown",V),f.domElement.removeEventListener("mousemove",H),f.domElement.removeEventListener("mouseup",N),f.domElement.removeEventListener("wheel",te),window.removeEventListener("resize",s),f.dispose(),o.removeChild(f.domElement),r.current=null}},[s]),A("div",{ref:t,class:"globe-wrapper",children:A("div",{ref:n,class:"globe-tooltip"})})}const a_=[{level:"CATASTROPHIC",label:"Catastrophic"},{level:"EXTREME",label:"Extreme"},{level:"SEVERE",label:"Severe"},{level:"STORMY",label:"Stormy"},{level:"CLOUDY",label:"Cloudy"},{level:"CLEAR",label:"Clear"}];function s_(){return new Date().toLocaleDateString("en-US",{weekday:"short",year:"numeric",month:"short",day:"numeric"})}function o_({selectedCountry:i,onCountrySelect:e}){const t=Pr(()=>e_(),[]),n=Pr(()=>t_(),[]);return A("aside",{class:"sidebar",children:[A("div",{class:"sidebar-header",children:[A("h1",{class:"logo",children:"GEOPOLITIQ"}),A("p",{class:"subtitle",children:"GLOBAL INTELLIGENCE NETWORK"}),A("div",{class:"live-bar",children:[A("span",{class:"live-dot"}),A("span",{class:"live-text",children:"LIVE"}),A("span",{class:"date-text",children:s_()})]})]}),A("div",{class:"watchlist",children:[A("h2",{class:"section-title",children:"CRITICAL WATCHLIST"}),A("div",{class:"watchlist-scroll",children:t.map(r=>{const a=bs(r.cii),s=As(a),o=(i==null?void 0:i.code)===r.code;return A("button",{class:`watchlist-item ${o?"selected":""}`,onClick:()=>e(r),children:[A("span",{class:"watchlist-flag",children:r.flag}),A("span",{class:"watchlist-name",children:r.name}),A("span",{class:"risk-badge",style:{backgroundColor:s,color:a==="SEVERE"?"#000":"#fff"},children:a})]},r.code)})})]}),A("div",{class:"legend",children:[A("h3",{class:"legend-title",children:"RISK LEVELS"}),A("div",{class:"legend-grid",children:a_.map(({level:r,label:a})=>A("div",{class:"legend-item",children:[A("span",{class:"legend-dot",style:{backgroundColor:As(r)}}),A("span",{class:"legend-label",children:a})]},r))})]}),A("div",{class:"stats-bar",children:[A("div",{class:"stat",children:[A("span",{class:"stat-value stat-critical",children:n.critical}),A("span",{class:"stat-label",children:"Critical"})]}),A("div",{class:"stat",children:[A("span",{class:"stat-value stat-high",children:n.highRisk}),A("span",{class:"stat-label",children:"High Risk"})]}),A("div",{class:"stat",children:[A("span",{class:"stat-value stat-stable",children:n.stable}),A("span",{class:"stat-label",children:"Stable"})]}),A("div",{class:"stat",children:[A("span",{class:"stat-value",children:n.total}),A("span",{class:"stat-label",children:"Total"})]})]})]})}const l_=[{time:"06:42 UTC",text:"Initial reports emerge from field correspondents. Multiple sources confirm activity."},{time:"07:15 UTC",text:"Government spokesperson issues preliminary statement. International media picks up story."},{time:"08:30 UTC",text:"Satellite imagery corroborates ground reports. OSINT community identifies key details."},{time:"09:00 UTC",text:"UN Secretary-General calls for restraint. Security Council briefing requested."},{time:"10:22 UTC",text:"Allied nations coordinate response. Intelligence sharing protocols activated."}];function xl(i){return{BREAKING:"badge-breaking",ALERT:"badge-alert",CONFLICT:"badge-conflict",WORLD:"badge-world",SECURITY:"badge-security",DIPLOMACY:"badge-diplomacy"}[i]||"badge-default"}function c_({event:i,onClose:e}){const t=Ui(n=>{n.target.classList.contains("modal-overlay")&&e()},[e]);return Ds(()=>{const n=r=>{r.key==="Escape"&&e()};return window.addEventListener("keydown",n),()=>window.removeEventListener("keydown",n)},[e]),A("div",{class:"modal-overlay",onClick:t,children:A("div",{class:"modal-card",children:[A("div",{class:"modal-header",children:[A("div",{class:"modal-badges",children:[A("span",{class:`badge ${xl(i.badge)}`,children:i.badge}),A("span",{class:`badge ${xl(i.category)}`,children:i.category}),A("span",{class:"modal-time",children:i.time})]}),A("button",{class:"modal-close",onClick:e,children:"×"})]}),A("h2",{class:"modal-title",children:i.headline}),i.stat&&A("div",{class:"modal-stat-pill",children:i.stat}),A("section",{class:"modal-section",children:[A("h3",{class:"modal-section-title",children:"INTELLIGENCE SUMMARY"}),A("div",{class:"modal-intel-block",children:[A("h4",{children:"What Happened"}),A("p",{children:i.update})]}),A("div",{class:"modal-intel-block",children:[A("h4",{children:"Why It Matters"}),A("p",{children:"This event has significant implications for regional stability and global supply chains. Multiple allied nations are monitoring the situation closely. Escalation risk remains elevated as diplomatic channels narrow and military postures harden."})]}),A("div",{class:"modal-intel-block",children:[A("h4",{children:"Outlook"}),A("p",{children:"Expect continued volatility over the next 48-72 hours. Key indicators to watch include troop movements, diplomatic statements from P5 members, and energy market reactions. Probability of further escalation: 65%."})]})]}),A("section",{class:"modal-section",children:[A("h3",{class:"modal-section-title",children:"LIVE TIMELINE"}),A("div",{class:"modal-timeline",children:l_.map((n,r)=>A("div",{class:"timeline-entry",children:[A("span",{class:"timeline-dot"}),A("div",{class:"timeline-content",children:[A("span",{class:"timeline-time",children:n.time}),A("p",{class:"timeline-text",children:n.text})]})]},r))})]})]})})}const u_=["1D","1W","1M","3M","1Y"];function d_({positive:i}){const e=i?"#22c55e":"#ef4444",t=i?"M10,70 L40,60 L70,65 L100,45 L130,50 L160,35 L190,20 L220,25 L250,15":"M10,20 L40,25 L70,30 L100,45 L130,40 L160,55 L190,60 L220,65 L250,70";return A("svg",{class:"mini-chart",viewBox:"0 0 260 80",preserveAspectRatio:"none",children:[A("defs",{children:A("linearGradient",{id:`grad-${i}`,x1:"0",y1:"0",x2:"0",y2:"1",children:[A("stop",{offset:"0%","stop-color":e,"stop-opacity":"0.3"}),A("stop",{offset:"100%","stop-color":e,"stop-opacity":"0"})]})}),A("path",{d:`${t} L250,80 L10,80 Z`,fill:`url(#grad-${i})`}),A("path",{d:t,fill:"none",stroke:e,"stroke-width":"2"})]})}function h_({market:i,onClose:e}){const[t,n]=kn("1D"),[r,a]=kn(""),s=Ui(l=>{l.target.classList.contains("modal-overlay")&&e()},[e]);Ds(()=>{const l=f=>{f.key==="Escape"&&e()};return window.addEventListener("keydown",l),()=>window.removeEventListener("keydown",l)},[e]);const o=i.indices[0],c=(o==null?void 0:o.positive)??!0;return A("div",{class:"modal-overlay",onClick:s,children:A("div",{class:"modal-card stock-modal",children:[A("div",{class:"modal-header",children:[A("div",{class:"stock-modal-title",children:[A("span",{class:"stock-flag",children:i.flag}),A("h2",{children:[i.country," Markets"]}),A("span",{class:`market-status ${i.open?"market-open":"market-closed"}`,children:i.open?"OPEN":"CLOSED"})]}),A("button",{class:"modal-close",onClick:e,children:"×"})]}),A("div",{class:"chart-container",children:A(d_,{positive:c})}),A("div",{class:"time-range-bar",children:u_.map(l=>A("button",{class:`time-btn ${t===l?"time-active":""}`,onClick:()=>n(l),children:l},l))}),A("section",{class:"modal-section",children:[A("h3",{class:"modal-section-title",children:"MARKET OVERVIEW"}),A("table",{class:"market-table",children:[A("thead",{children:A("tr",{children:[A("th",{children:"Index"}),A("th",{children:"Value"}),A("th",{children:"Change"})]})}),A("tbody",{children:i.indices.map(l=>A("tr",{children:[A("td",{children:l.name}),A("td",{class:"table-value",children:l.value}),A("td",{class:l.positive?"positive":"negative",children:l.change})]},l.name))})]})]}),A("div",{class:"ticker-search",children:[A("input",{type:"text",class:"ticker-input",placeholder:"Search ticker (e.g. AAPL)...",value:r,onInput:l=>a(l.target.value)}),A("button",{class:"ticker-go",children:"GO"})]}),A("section",{class:"modal-section",children:[A("h3",{class:"modal-section-title",children:"WHY IT MATTERS"}),A("p",{class:"modal-text",children:[i.country," markets reflect broader geopolitical sentiment. Current movements indicate ",c?"cautious optimism despite":"growing concern over"," ongoing global tensions. Institutional investors are ",c?"maintaining positions":"rotating to safe havens","."]})]}),A("section",{class:"modal-section",children:[A("h3",{class:"modal-section-title",children:"OUTLOOK"}),A("p",{class:"modal-text",children:"Key catalysts ahead: central bank decisions, trade negotiation outcomes, and geopolitical developments in Eastern Europe and the Middle East. Volatility expected to remain above historical averages through Q2 2026."})]})]})})}const f_=[{id:"events",label:"Events"},{id:"brief",label:"Brief"},{id:"elections",label:"Elections"},{id:"forecast",label:"Forecast"},{id:"horizon",label:"Horizon"},{id:"stocks",label:"Stocks"},{id:"travel",label:"Travel"}],p_=[{id:1,badge:"BREAKING",category:"CONFLICT",headline:"Major Escalation in Eastern Mediterranean",stat:"3 carrier groups deployed",update:"NATO emergency session called for 0800 UTC. Article 5 consultations underway.",time:"12m ago"},{id:2,badge:"BREAKING",category:"SECURITY",headline:"Cyber Attack Disrupts European Power Grid",stat:"4 nations affected",update:"Rolling blackouts reported across Baltic states. APT group attribution pending.",time:"28m ago"},{id:3,badge:"ALERT",category:"WORLD",headline:"UN Security Council Emergency Session on Sudan",stat:"2.1M displaced",update:"Resolution draft circulating among P5 members. China signals possible abstention.",time:"1h ago"},{id:4,badge:"ALERT",category:"DIPLOMACY",headline:"Iran Nuclear Talks Collapse in Vienna",stat:"JCPOA dead",update:"EU mediator withdraws. IAEA reports 84% enrichment detected at Fordow.",time:"2h ago"}],m_=[{id:5,category:"CONFLICT",sources:"Reuters, AFP",time:"3h ago",headline:"Drone Strikes Hit Fuel Depot in Kharkiv Oblast",summary:"Ukrainian air defenses intercepted 12 of 18 drones. Critical infrastructure damage confirmed."},{id:6,category:"WORLD",sources:"AP, BBC",time:"4h ago",headline:"Earthquake M6.2 Strikes Southern Turkey",summary:"USGS reports shallow depth. No tsunami warning issued. Rescue teams mobilizing."},{id:7,category:"SECURITY",sources:"Bellingcat, OSINT",time:"5h ago",headline:"Satellite Imagery Reveals New Missile Silos in Western China",summary:"Commercial satellite analysis identifies 40+ new ICBM silos under construction."}],__=[{country:"France",flag:"🇫🇷",date:"Mar 2026",type:"Presidential",winner:"Marine Le Pen (RN)"},{country:"Brazil",flag:"🇧🇷",date:"Feb 2026",type:"Municipal",winner:"Coalition shift right"}],g_=[{country:"Germany",flag:"🇩🇪",date:"Sep 2026",type:"Federal",desc:"CDU leads polls at 31%"},{country:"Japan",flag:"🇯🇵",date:"Jul 2026",type:"Upper House",desc:"LDP majority uncertain"},{country:"Colombia",flag:"🇨🇴",date:"Oct 2026",type:"Regional",desc:"Security top concern"}],v_=[{region:"Middle East",severity:"CATASTROPHIC",analysis:"Multi-front conflict escalation likely within 90 days. Iran proxy network activation signals imminent.",trends:["↑ Total War","↓ Diplomacy","↑ Oil Disruption"]},{region:"Eastern Europe",severity:"EXTREME",analysis:"Frozen conflict status unlikely to hold through Q2. NATO eastern flank reinforcement accelerating.",trends:["↑ Escalation","↑ Arms Race","↓ Ceasefire"]},{region:"Indo-Pacific",severity:"SEVERE",analysis:"Taiwan Strait tensions elevated. PLA exercises frequency doubled YoY. Diplomatic channels narrowing.",trends:["↑ Military Posturing","↓ Trade","↑ Alliances"]},{region:"Sub-Saharan Africa",severity:"EXTREME",analysis:"Coup contagion spreading. Wagner/Africa Corps expansion into 3 additional countries projected.",trends:["↑ Instability","↓ Democracy","↑ Displacement"]}],x_=[{month:"March 2026",items:[{cat:"Summit",title:"G20 Foreign Ministers Meeting - Cape Town",date:"Mar 21-22"},{cat:"Military",title:"NATO Steadfast Defender Exercise Concludes",date:"Mar 25"}]},{month:"April 2026",items:[{cat:"Election",title:"South Korea Presidential Election",date:"Apr 9"},{cat:"Economic",title:"IMF/World Bank Spring Meetings",date:"Apr 14-20"},{cat:"Treaty",title:"NPT Review Conference",date:"Apr 28"}]},{month:"May 2026",items:[{cat:"Sanctions",title:"EU Russia Sanctions Package Review",date:"May 5"},{cat:"Summit",title:"ASEAN Leaders Summit - Jakarta",date:"May 12-14"}]}],M_=[{country:"United States",flag:"🇺🇸",open:!0,indices:[{name:"S&P 500",value:"5,892.41",change:"+0.73%",positive:!0},{name:"NASDAQ",value:"18,847.28",change:"+1.12%",positive:!0},{name:"DOW",value:"43,218.50",change:"+0.34%",positive:!0}]},{country:"United Kingdom",flag:"🇬🇧",open:!1,indices:[{name:"FTSE 100",value:"8,341.20",change:"-0.28%",positive:!1}]},{country:"Japan",flag:"🇯🇵",open:!1,indices:[{name:"Nikkei 225",value:"39,812.44",change:"+0.91%",positive:!0}]},{country:"China",flag:"🇨🇳",open:!1,indices:[{name:"Shanghai",value:"3,284.16",change:"-0.45%",positive:!1},{name:"Hang Seng",value:"21,442.80",change:"+0.62%",positive:!0}]},{country:"Germany",flag:"🇩🇪",open:!1,indices:[{name:"DAX",value:"18,921.33",change:"+0.15%",positive:!0}]}],S_=[{location:"Eastern Ukraine",desc:"Active combat zone. Artillery and drone strikes daily.",level:5},{location:"Gaza Strip",desc:"Military operations ongoing. No safe corridors.",level:5},{location:"Khartoum, Sudan",desc:"Urban warfare between SAF and RSF.",level:5},{location:"Mogadishu, Somalia",desc:"Al-Shabaab active. IED and VBIED risk.",level:4},{location:"Port-au-Prince, Haiti",desc:"Gang control of 80% of capital.",level:4},{location:"Kabul, Afghanistan",desc:"ISIS-K attacks. No consular services.",level:4},{location:"Tripoli, Libya",desc:"Militia clashes. Kidnapping risk.",level:3},{location:"Caracas, Venezuela",desc:"Political unrest. Arbitrary detention risk.",level:3}],Ml={Summit:"#3b82f6",Election:"#a855f7",Treaty:"#22c55e",Military:"#ef4444",Economic:"#eab308",Sanctions:"#f97316"};function Aa(i){return{BREAKING:"badge-breaking",ALERT:"badge-alert",CONFLICT:"badge-conflict",WORLD:"badge-world",SECURITY:"badge-security",DIPLOMACY:"badge-diplomacy"}[i]||"badge-default"}function E_(i){return i==="CATASTROPHIC"?"#ef4444":i==="EXTREME"?"#f97316":"#eab308"}function y_(i){return i>=5?"#ef4444":i>=4?"#f97316":i>=3?"#eab308":"#3b82f6"}function T_({selectedCountry:i}){const[e,t]=kn("events"),[n,r]=kn(13),[a,s]=kn(null),[o,c]=kn(null),l=()=>A("div",{class:"tab-content",children:[A("h3",{class:"section-title",children:"TOP STORIES"}),p_.map(u=>A("div",{class:"event-card",onClick:()=>s(u),children:[A("div",{class:"event-badges",children:[A("span",{class:`badge ${Aa(u.badge)}`,children:u.badge}),A("span",{class:`badge ${Aa(u.category)}`,children:u.category}),A("span",{class:"event-time",children:u.time})]}),A("h4",{class:"event-headline",children:u.headline}),A("span",{class:"event-stat",children:u.stat}),A("p",{class:"event-update",children:u.update})]},u.id)),A("h3",{class:"section-title",style:{marginTop:16},children:"LATEST UPDATES"}),m_.map(u=>A("div",{class:"update-card",onClick:()=>s({...u,badge:"ALERT",stat:"",update:u.summary}),children:[A("div",{class:"update-meta",children:[A("span",{class:`badge ${Aa(u.category)}`,children:u.category}),A("span",{class:"update-sources",children:u.sources}),A("span",{class:"update-time",children:u.time})]}),A("h4",{class:"update-headline",children:u.headline}),A("p",{class:"update-summary",children:u.summary})]},u.id)),A("button",{class:"load-more-btn",children:"LOAD MORE"})]}),f=()=>A("div",{class:"tab-content",children:[A("div",{class:"brief-header",children:[A("h3",{class:"section-title",children:"DAILY INTELLIGENCE BRIEFING"}),A("span",{class:"live-badge",children:"LIVE"})]}),[{name:"Middle East",count:4,summary:"Multi-axis escalation continues. Iranian proxy network activated across Lebanon, Yemen, Iraq, and Syria. Israeli operations expanding. US carrier groups repositioning."},{name:"Asia-Pacific",count:3,summary:"PLA exercises near Taiwan intensify. North Korea missile tests resume after 60-day pause. Philippines-China maritime incidents at Second Thomas Shoal."},{name:"Americas",count:2,summary:"Venezuela border tensions with Guyana. Haiti transitional government collapse imminent. US southern border crisis deepening."},{name:"Europe",count:3,summary:"Ukraine front lines fluid. NATO eastern flank buildup accelerating. Energy security concerns as Russian gas transit via Ukraine expires."},{name:"Africa",count:3,summary:"Sudan humanitarian catastrophe worsening. Sahel coup belt expanding. Horn of Africa drought entering critical phase."}].map(M=>A("div",{class:"brief-region",children:[A("div",{class:"brief-region-header",children:[A("h4",{children:M.name}),A("span",{class:"brief-count",children:[M.count," critical"]})]}),A("p",{class:"brief-summary",children:M.summary})]},M.name)),A("div",{class:"brief-region",children:[A("h4",{class:"section-title",children:"GLOBAL RAMIFICATIONS"}),A("p",{class:"brief-summary",children:"Simultaneous multi-theater instability creates cascading risk. Supply chain disruptions via Red Sea, energy price volatility, and refugee flows straining European consensus. Nuclear proliferation concerns elevated."})]})]}),d=()=>A("div",{class:"tab-content",children:[A("h3",{class:"section-title",children:"RECENT RESULTS"}),__.map(u=>A("div",{class:"election-card",children:[A("span",{class:"election-flag",children:u.flag}),A("div",{class:"election-info",children:[A("h4",{children:u.country}),A("span",{class:"election-meta",children:[u.date," - ",u.type]}),A("span",{class:"election-winner",children:u.winner})]})]},u.country)),A("h3",{class:"section-title",style:{marginTop:16},children:"UPCOMING ELECTIONS"}),g_.map(u=>A("div",{class:"election-card",children:[A("span",{class:"election-flag",children:u.flag}),A("div",{class:"election-info",children:[A("h4",{children:u.country}),A("span",{class:"election-meta",children:[u.date," - ",u.type]}),A("span",{class:"election-desc",children:u.desc})]})]},u.country))]}),h=()=>A("div",{class:"tab-content",children:[A("h3",{class:"section-title",children:"REGIONAL FORECASTS"}),v_.map(u=>A("div",{class:"forecast-card",children:[A("div",{class:"forecast-header",children:[A("h4",{children:u.region}),A("span",{class:"severity-badge",style:{backgroundColor:E_(u.severity)},children:u.severity})]}),A("p",{class:"forecast-analysis",children:u.analysis}),A("div",{class:"forecast-trends",children:u.trends.map(M=>A("span",{class:`trend-tag ${M.startsWith("↑")?"trend-up":"trend-down"}`,children:M},M))})]},u.region))]}),p=()=>A("div",{class:"tab-content",children:[A("div",{class:"horizon-header",children:[A("h3",{class:"section-title",children:"LOOKING AHEAD"}),A("span",{class:"horizon-count",children:"7 events"})]}),A("div",{class:"horizon-filters",children:Object.entries(Ml).map(([u,M])=>A("span",{class:"horizon-filter",style:{borderColor:M,color:M},children:u},u))}),x_.map(u=>A("div",{class:"horizon-month",children:[A("h4",{class:"horizon-month-title",children:u.month}),u.items.map(M=>A("div",{class:"horizon-item",children:[A("span",{class:"horizon-cat-dot",style:{backgroundColor:Ml[M.cat]}}),A("div",{class:"horizon-item-info",children:[A("span",{class:"horizon-item-date",children:M.date}),A("span",{class:"horizon-item-title",children:M.title})]})]},M.title))]},u.month))]}),g=()=>A("div",{class:"tab-content",children:[A("div",{class:"stocks-header",children:[A("h3",{class:"section-title",children:"GLOBAL MARKETS"}),A("span",{class:"stocks-time",children:"Updated 5m ago"})]}),M_.map(u=>A("div",{class:"market-section",onClick:()=>c(u),children:[A("div",{class:"market-header",children:[A("span",{children:[u.flag," ",u.country]}),A("span",{class:`market-status ${u.open?"market-open":"market-closed"}`,children:u.open?"OPEN":"CLOSED"})]}),u.indices.map(M=>A("div",{class:"index-row",children:[A("span",{class:"index-name",children:M.name}),A("span",{class:"index-value",children:M.value}),A("span",{class:`index-change ${M.positive?"positive":"negative"}`,children:M.change})]},M.name))]},u.country))]}),S=()=>A("div",{class:"tab-content",children:[A("h3",{class:"section-title",children:"TRAVEL ADVISORY"}),A("div",{class:"travel-search",children:A("input",{type:"text",class:"travel-input",placeholder:"Search location..."})}),A("h4",{class:"danger-title",children:"DANGER ZONES"}),S_.map(u=>A("div",{class:"danger-card",children:[A("div",{class:"danger-header",children:[A("span",{class:"danger-location",children:u.location}),A("span",{class:"danger-level",style:{backgroundColor:y_(u.level)},children:["LVL ",u.level]})]}),A("p",{class:"danger-desc",children:u.desc})]},u.location))]}),m=()=>{switch(e){case"events":return l();case"brief":return f();case"elections":return d();case"forecast":return h();case"horizon":return p();case"stocks":return g();case"travel":return S()}};return A("aside",{class:"right-panel",style:{fontSize:`${n}px`},children:[A("div",{class:"panel-controls",children:[A("button",{class:"font-btn",onClick:()=>r(u=>Math.max(10,u-1)),children:"A-"}),A("button",{class:"font-btn",onClick:()=>r(u=>Math.min(18,u+1)),children:"A+"})]}),A("nav",{class:"tab-bar",children:f_.map(u=>A("button",{class:`tab-btn ${e===u.id?"tab-active":""}`,onClick:()=>t(u.id),children:u.label},u.id))}),A("div",{class:"panel-scroll",children:m()}),a&&A(c_,{event:a,onClose:()=>s(null)}),o&&A(h_,{market:o,onClose:()=>c(null)})]})}function b_(){const[i,e]=kn(null),t=Ui(r=>{e(r)},[]),n=Ui(r=>{e(r)},[]);return A("div",{class:"app-layout",children:[A(o_,{selectedCountry:i,onCountrySelect:n}),A("div",{class:"globe-container",children:A(r_,{onCountryClick:t,selectedCountry:i})}),A(T_,{selectedCountry:i})]})}Rc(A(b_,{}),document.getElementById("root"));
