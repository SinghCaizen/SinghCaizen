try{var t=localStorage.getItem("pf_theme");if(t)document.documentElement.setAttribute("data-theme",t);if(sessionStorage.getItem("folio_splash_v1"))document.documentElement.classList.add("splash-seen");}catch(e){}
/* Phase 7: resolve the Animations setting pre-paint (device mirror
   folio_anim + the device reduce-motion hint) so the splash and the
   first view never animate in a mode the user turned off. This is a
   deliberate miniature of folioAnimResolve() in js/features.js —
   the two must agree: off -> off; reduced -> reduced; full/auto ->
   reduced when the device asks for reduced motion, else full. */
try{var a=localStorage.getItem("folio_anim");if(a!=="full"&&a!=="reduced"&&a!=="off")a="auto";var prm=!!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);var eff=(a==="off")?"off":(a==="reduced"||prm)?"reduced":"full";document.documentElement.setAttribute("data-anim",eff);}catch(e){}
