import {render} from "./view-engine";


let scope = {};
let props = {};
let html = render('page', scope, props);

console.log(html);