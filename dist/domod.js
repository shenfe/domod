!function(n,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports):"function"==typeof define&&define.amd?define(["exports"],e):e(n.domod={})}(this,function(n){"use strict";function e(n,e,t,r){n.addEventListener?n.addEventListener(e,t,!!r):("input"===e&&(e="propertychange"),n.attachEvent("on"+e,t))}function t(n,e,r){e=e||function(){return!0};var u={};return M(n,function(n,o){if(m(n)&&!e(n)){var i=t(n,e,r);M(i,function(n,e){u[o+"."+e]=n})}else!e(n)&&r||(u[o]=n)}),u}function r(n,e){if(e===undefined&&(e=I),!m(e)&&!T(e)||!E(n))return null;for(var t=e,r=n.split(".");r.length>=1;){if(1===r.length)return{target:t,property:r[0]};if(t=t[r.shift()],!m(t)&&!T(t))return null}return null}function u(n,e){var t=r(n,e);if(!t)return null;var i=o(n,e);if(!L[i])return t.target[t.property];var f=L[i].f.apply(I,L[i].deps.map(function(n){return u(n)}));return t.target[t.property]=f,f}function o(n,e){return e===undefined?n:i(e)+"."+n}function i(n){if(!m(n)&&!T(n))return null;if(!n.__kernel_root){var e="kr_"+g();T(n)?n.__kernel_root=e:Object.defineProperty(n,"__kernel_root",{value:e}),I[e]=n}return n.__kernel_root}function f(n,e){return(m(n)||E(n))&&(n=[n]),k(n)?n.map(function(n){return m(n)?i(n.root)+"."+n.alias:E(n)?i(e)+"."+n:null}):[]}function a(n){return S[n]===undefined?0:S[n].length}function c(n,e,t){var o=r(e,n);if(null!=o){var c=i(n)+"."+e,l=c+"#"+a(c);Object.defineProperty(this,"__kid",{value:l}),U[this.__kid]=1;var s=o.target[o.property];S[c]===undefined&&(S[c]=[],P(o.target,o.property)&&delete o.target[o.property]),S[c].push(1);var p=f(t.dnstream),d=t.resultIn,v=f(t.upstream),h=t.resultFrom,y=!!t.lazy;P(t,"value")&&(s=t.value),A[c]||(A[c]={}),p.forEach(function(n){C[n]||(C[n]={}),C[n][c]||(C[n][c]={}),C[n][c][l]=1,A[c][n]||(A[c][n]={}),A[c][n][l]=1}),z[c]||(z[c]=[]),z[c].push(O(d)?d:null),C[c]||(C[c]={}),v.forEach(function(n){C[c][n]||(C[c][n]={}),C[c][n][l]=1,A[n]||(A[n]={}),A[n][c]||(A[n][c]={}),A[n][c][l]=1}),O(h)&&(L[c]={f:h,k:this.__kid,deps:v}),y&&(R[c]=!0),1!==S[c].length||T(o.target)||Object.defineProperty(o.target,o.property,{get:function(){return L[c]&&0!==U[L[c].k]?u(c):s},set:function(e){e!==s&&(s=e,z[c]&&z[c].forEach(function(t,r){t&&0!==U[c+"#"+r]&&t.apply(n,[e])}),A[c]&&M(A[c],function(n,e){var t=!1;M(n,function(n,e){if(0!==U[e])return t=!0,!1}),t&&L[e]&&!R[e]&&u(e)}))},enumerable:!0})}}function l(n){if(!m(n))return!1;var e=!0,t={__isRelation:2,dnstream:1,resultIn:1,upstream:1,resultFrom:1,lazy:!0,value:!0},r=0;return M(n,function(n,u){return 2===t[u]?(e=!0,r++,!1):t[u]?void(1===t[u]&&r++):(e=!1,!1)}),e&&r>0}function s(n,e){var r;if(1===arguments.length){if(!m(n))return null;r=t(n,l,!0)}else{if(!m(e))return null;r=t(e,l,!0)}return M(r,function(e,t){new c(n,t,e)}),n}function p(n,t){if(T(n)&&m(t))if(n.nodeType!==Node.ELEMENT_NODE||n[V.domBoundFlag]){if(n.nodeType===Node.TEXT_NODE){var r=_(n.nodeValue).join(";");new c(n,"nodeValue",N(r,t,function(){return h(n.nodeValue,t)}))}}else n[V.domBoundFlag]=!0,M(n.attributes,function(r,u){if(u.startsWith(V.attrPrefix))switch(u=u.substr(V.attrPrefix.length)){case"value":e(n,"input",function(n){x(t,r,this.value)},!1),new c(n,u,N(r,t));break;case"innerText":case"innerHTML":new c(n,u,N(r,t));break;case"class":new c(n,"className",N(r,t,function(){h(r,t)}));break;case"style":new c(n,"style.cssText",N(r,t,function(){h(r,t)}));break;default:var o=w(u);if(o)e(n,o,function(e){new Function(["e"].concat(Object.keys(t)).join(","),r).apply(n,Object.values(t))},!1);else{var i=function(e){n.setAttribute(u,new Function(Object.keys(t).join(","),"return "+r).apply(n,Object.values(t)))},f={};M(y(r),function(n){f[n]={resultIn:i}}),s(t,f)}}}),M(n,function(n){p(n,t)})}function d(n,e){n=v(n);var t=Object.keys(e),r=Object.values(e);M(r,function(n,t){O(n)&&(r[t]=n.bind(e))});var u=null;try{u=new Function(t.join(","),"return "+n).apply(e,r)}catch(o){}return u}function v(n){var e=/{{([^{}]*)}}/g;return n.replace(e,function(n,e){return"' + ("+e+") + '"})}function h(n,e){var t=/{{([^{}]*)}}/g;return n.replace(t,function(n,t){return d(t,e)})}function y(n){var e=/([a-zA-Z$_][0-9a-zA-Z$_]*)(\.[a-zA-Z$_][0-9a-zA-Z$_]*)*/g;return(n=";"+n+";").match(e)}function _(n){var e=/{{([^{}]*)}}/g,t=[];return n.replace(e,function(n,e){return t.push(e),""}),t}function N(n,e,t){return{upstream:function(n,e){var t={};return M(y(n),function(n){t[n]=x(e,n)}),F(t)}(n,e).map(function(n){return{root:e,alias:n}}),resultFrom:t||function(){return d(n,e)}}}var g=function(){var n=0;return function(){return n++}}(),b=function(n){var e=parseInt(n);return!isNaN(e)&&(("number"==typeof n||"string"==typeof n)&&e==n)},E=function(n){return"string"==typeof n},O=function(n){return"function"==typeof n},m=function(n){return null!=n&&"[object Object]"===Object.prototype.toString.call(n)},k=function(n){return"[object Array]"===Object.prototype.toString.call(n)},j=function(n){return null==n||"boolean"==typeof n||"number"==typeof n||"string"==typeof n||"function"==typeof n},T=function(n){return"function"==typeof Node&&n instanceof Node},D=function(n){return n instanceof NamedNodeMap},w=function(n){return!(!E(n)||!n.startsWith("on"))&&n.substr(2)},M=function(n,e,t){if(m(n)){for(var r in n)if(n.hasOwnProperty(r)&&!1===(a=e(n[r],r)))break}else if(k(n))if(t)for(u=n.length-1;u>=0&&!1!==(a=e(n[u],u));u--);else for(var u=0,o=n.length;u<o&&!1!==(a=e(n[u],u));u++);else if(T(n)){var i=!1;switch(n.nodeType){case Node.ELEMENT_NODE:break;case Node.TEXT_NODE:case Node.COMMENT_NODE:case Node.PROCESSING_INSTRUCTION_NODE:case Node.DOCUMENT_NODE:case Node.DOCUMENT_TYPE_NODE:case Node.DOCUMENT_FRAGMENT_NODE:default:i=!0}if(i)return;for(var u=0,f=n.childNodes,o=n.childNodes.length;u<o;u++)e(f[u]),M(f[u],e)}else if(D(n))for(var u=0,o=n.length;u<o;u++){var a=e(n[u].nodeValue,n[u].nodeName);if(!1===a)break}else O(n.forEach)&&n.forEach(e)},P=function(n,e){if(m(n))return n.hasOwnProperty(e);if(k(n)){var t=parseInt(e);return b(e)&&n.length>t&&t>=0}return!1},F=function(n){var e=[];return M(n,function(n,t){if(m(n)){var r=F(n);M(r,function(n,r){e.push(t+"."+r)})}else e.push(t)}),e},x=function(n,e,t){var r=arguments.length>=3,u=n,o=[];if(e&&(o=e.split(".")),r){for(;o.length;){if(j(u))return undefined;1===o.length?u[path.shift()]=t:u=u[path.shift()]}return t}for(;o.length;){if(j(u))return undefined;u=u[path.shift()]}return u},I={},A={},z={},C={},L={},R={},S={},U={};c.prototype.disable=function(){U[this.__kid]=0},c.prototype.enable=function(){U[this.__kid]=1},c.prototype.destroy=function(){};var V={attrPrefix:"m-",domBoundFlag:"__dmd_bound"};n.Kernel=c,n.Relate=s,n.DMD=function(n,e){p.call(this,n,e)},Object.defineProperty(n,"__esModule",{value:!0})});
//# sourceMappingURL=domod.js.map
