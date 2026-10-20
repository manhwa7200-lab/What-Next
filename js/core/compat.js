/* js/core/compat.js: small fallbacks for older Android WebViews */
if(!Element.prototype.replaceChildren){
  Element.prototype.replaceChildren = function(...nodes){ while(this.firstChild) this.removeChild(this.firstChild); this.append(...nodes); };
}
