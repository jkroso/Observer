define("Subscription",[],function(){function e(e,t,n){if(typeof t!="function"||typeof n!="number")throw"Incorrect argument format";this.context=e,this.callback=t,this.priority=n}return e.prototype={trigger:function(e){return this.callback.call(this.context,e)}},e}),define("Topic",["Subscription"],function(e){function t(e){Object.defineProperties(this,{_listeners:{value:Object.prototype.toString.call(e)==="[object Array]"?e:[],writable:!0}})}return t.prototype={subscribe:function(t,n,r){return typeof t=="function"&&(r=n||0,n=t,t=window),this.add(new e(t,n,r||0))},add:function(e){var t=this._listeners.slice(),n=e.priority,r=!1;for(var i=0,s=t.length;i<s;i++)if(t[i].priority>=n){t.splice(i,0,e),r=!0;break}return r||t.push(e),this._listeners=t,this},remove:function(e){var t;switch(typeof e){case"function":t=function(t){return t.callback!==e};break;case"string":t=function(t){return t.callback.name!==e};break;case"object":t=function(t){return t!==e};break;default:t=function(){return!1}}return this._listeners=this._listeners.filter(t),this},invoke:function(e){var t=this._listeners,n=t.length;if(n>0)do if(t[--n].trigger(e)===!1)return!1;while(n);return!0}},t}),define("SignalTree",["Topic","Subscription"],function(e,t){function n(){return Object.defineProperties(this,{_base:{value:new e,writable:!0}})}return n.methods=function(e){return Object.keys(n.prototype).forEach(function(t){e.hasOwnProperty(t)||Object.defineProperty(e,t,{value:n.prototype[t],writable:!0,configurable:!0})}),e},n.mixin=function(e){return n.call(e),n.methods(e),e},n.prototype={get:function(t,n){if(!t)return this._base;t=t.split(".");var r=this._base,i,s=t.length,o=0;if(s)do{i=t[o++];if(r[i]instanceof e)r=r[i];else{if(!n)break;r=r[i]=new e}}while(o<s);return r},publish:function(e,t){return typeof e=="string"?e=n.prototype.collect.call(this,e.split(".")):(t=e,e=this._base._listeners),n.prototype._emit.call(this,e,t)},_emit:function(e,t){var n=e.length,r,i;while(n--){i=e[n],r=i.length;if(r>0)do if(i[--r].trigger(t)===!1)return!1;while(r)}return!0},on:function(e,n,r,i){switch(arguments.length){case 3:typeof r=="number"?(i=r,r=n,n=window):i=0;break;case 2:r=n,n=window,i=0;break;case 1:r=e,e="",n=window,i=0;break;case 0:throw"Insufficient arguments"}var s=new t(n,r,i);return e.split(" ").forEach(function(e){this.get(e,!0).add(s)},this),s},once:function(e,n,r,i){switch(arguments.length){case 3:typeof r=="number"?(i=r,r=n,n=window):i=0;break;case 2:r=n,n=window,i=0;break;case 1:r=e,e="",n=window,i=0;break;case 0:throw"Insufficient arguments"}var s=new t(n,r,i);return s._topics=[],s.trigger=function(e){return this._topics.forEach(function(e){e.remove(this)}),this.callback.call(this.context,e)},e.split(" ").forEach(function(e){var t=this.get(e,!0);s._topics.push(t),t.add(s)},this),s},off:function(e,t){if(typeof e!="string"){if(!!t)throw"no topic specified";this._base.removeListener(e)}e.split(" ").forEach(function(e){e=this.get(e,!1),e&&e.remove(t)},this)},branchingCollect:function r(e,t){var n=0,i=e.length,s,o,u=[t._listeners];while(n<i)s=e[n++],o=s[0],o in t&&(u=u.concat(r(s.slice(1),t[o])));return u},collect:function(e){var t=this._base,n=[t._listeners],r=e.length,i=0;while(i<r){t=t[e[i++]];if(!t)break;n.push(t._listeners)}return n}},Object.defineProperty(n.prototype,"constructor",{value:n}),n.mixin(n)})