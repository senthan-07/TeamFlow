/** Inline in <head> so a saved theme applies before first paint (no flash of the wrong theme). */
export const themeBootScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
