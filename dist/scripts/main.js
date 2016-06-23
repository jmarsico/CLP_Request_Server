"use strict";function _classCallCheck(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}var constrainValue=function(t){var e=t.target,n=parseInt(e.value,10),a=parseInt(e.min,10),r=parseInt(e.max,10);""===n||a>n?n=a:n>r&&(n=r),e.value=n},displayError=function(t){var e=$('<li class="error">\n      <span class="error-timestamp">'+(new Date).toLocaleString()+':</span>\n      <span class="error-message">'+t+'</span>\n      <button type="button" class="error-dismiss">⨉</span>\n    </li>');e.on("click",dismissError),e.hide(),$("#errors").append(e),e.fadeIn()},dismissError=function(t){var e=$(t.target).parent(".error");$(t.target).parent(".error").fadeOut(400,function(){e.remove()})},API=function(){var t="http://lightwall.carnegielibrary.org/",e=function(t,e){return axios.get(t)},n=function(t,e){return axios.post(t,e)},a=function(){return new Promise(function(t,e){var n=["running","paused","offline"],a=["wave","ambience"],r=["22fps","26fps","30fps"];t({data:{status:n[Math.floor(3*Math.random())],scene:a[Math.floor(2*Math.random())],frame_rate:r[Math.floor(3*Math.random())]},status:200,statusText:"OK",header:{},config:{}})})},r=function(){return new Promise(function(t,e){t({data:{},status:500,statusText:"OK",header:{},config:{}})})},o=function(){return new Promise(function(t,e){t({data:{},status:200,statusText:"OK",header:{},config:{}})})},s=function(t,e){var n=new Date(Date.now()+36e5*t+6e4*e);return new Promise(function(t,e){t({data:{resume_at:n.toLocaleString()},status:200,statusText:"OK",header:{},config:{}})})};return{rootUrl:t,get:e,post:n,requestStatus:a,requestPowerOn:r,requestPowerOff:o,requestPause:s}}(),APIBuilder=function(){var t=API.rootUrl,e=function(){return $("#output").text()},n=function(t){return'<span class="new">'+t+"</span>"},a=function(t){$("#output").html(t)},r=function(){$("canvas").get().forEach(function(t){new Canvas(t).clear()}),$(".parameters input").get().forEach(function(t){t.value=""})},o=function(e){r();var o=n(e.target.value),s=""+t+o;a(s)},s=function(t){constrainValue(t);var r=t.target.value,o=t.target.name,s=o+"="+r,i=e();""===r&&i.match(o)?i.match("\\?"+o+"=\\d*$")?i=i.replace(new RegExp("\\?"+o+"=\\d*$"),""):i.match("\\?"+o)?i=i.replace(new RegExp(o+"=\\d*&"),""):i.match(""+o)&&(i=i.replace(new RegExp("&"+o+"=\\d*"),"")):i.match(o)?i=i.replace(new RegExp(o+"=\\d*"),n(s)):i+=n(-1===i.indexOf("?")?"?"+s:"&"+s),a(i)},i=function(t,r,o,s){var i=Math.floor((r-15)/5.7),c=Math.floor((s-5)/1.5),l=e(),u=t+"="+i+"&"+o+"="+c;-1!==l.indexOf(t)?(u=n(t+"="+i)+"&"+n(o+"="+c),l=l.replace(new RegExp(t+"=\\d*&"+o+"=\\d*"),u)):l+=n(-1===l.indexOf("?")?"?"+u:"&"+u),a(l)},c=function(t){var n=e();API.get(n).then(function(t){200===t.status?alert("Success"):displayError("Bad request, please try again.")})["catch"](function(t){displayError("We were unable to reach the Light Wall server, please try again in a minute.")})};return{buildEvent:o,addParameter:s,addCoordinateParameters:i,sendRequest:c}}();$(".event-checkbox").on("click",APIBuilder.buildEvent),$(".parameters input").on("change",APIBuilder.addParameter),$("#send-request").on("click",APIBuilder.sendRequest);var _createClass=function(){function t(t,e){for(var n=0;n<e.length;n++){var a=e[n];a.enumerable=a.enumerable||!1,a.configurable=!0,"value"in a&&(a.writable=!0),Object.defineProperty(t,a.key,a)}}return function(e,n,a){return n&&t(e.prototype,n),a&&t(e,a),e}}(),Canvas=function(){function t(e){_classCallCheck(this,t),this.canvas=e,this.context=e.getContext("2d")}return _createClass(t,[{key:"getCoordinates",value:function(t){var e=this.canvas.getBoundingClientRect(),n=t.clientX-(e.left+1),a=t.clientY-(e.top+2);return 15>n?n=15:n>585&&(n=585),5>a?a=5:a>155&&(a=155),{x:n,y:a}}},{key:"clear",value:function(){this.context.clearRect(0,0,this.canvas.width,this.canvas.height)}},{key:"drawPoint",value:function(t,e,n){var a=this.fillStyle;this.context.beginPath(),this.context.fillStyle=n,this.context.moveTo(t,e),this.context.arc(t,e,5,0,2*Math.PI,!0),this.context.fill(),this.context.closePath(),this.context.fillStyle=a}},{key:"labelPoint",value:function(t,e,n,a){var r=this.fillStyle;this.context.fillStyle=a,this.context.font="16px Helvetica Neue",this.context.textAlign="center",this.context.fillText(n,t,e+18),this.context.fillStyle=r}},{key:"drawLine",value:function(t,e,n,a,r){var o=this.strokeStyle;this.context.beginPath(),this.context.strokeStyle=r,this.context.moveTo(t,e),this.context.lineTo(n,a),this.context.stroke(),this.context.closePath(),this.context.strokeStyle=o}}]),t}(),showParameters=function(t){var e=t.target.value,n=$("#"+e+"-parameters");"none"===n.css("display")&&$.when($(".parameters").hide(0)).done(function(){n.fadeIn(400)})};$(".event-checkbox").on("click",showParameters);var setExplosionCoordinates=function(t){return function(e){var n=t.getCoordinates(e);t.clear(),t.drawPoint(n.x,n.y,"#703778"),APIBuilder.addCoordinateParameters("start_x",n.x,"start_y",n.y)}},explosionStart=$("#explosion-start"),explosionStartCanvas=new Canvas(explosionStart.find("canvas").get()[0]);explosionStart.on("click",setExplosionCoordinates(explosionStartCanvas));var setSweepCoordinates=function(t){var e="start",n={x:0,y:0};return function(a){var r=t.getCoordinates(a);"start"===e?(t.clear(),t.drawPoint(r.x,r.y,"#703778"),t.labelPoint(r.x,r.y,"start","#703778"),APIBuilder.addCoordinateParameters("start_x",r.x,"start_y",r.y),e="end",n=r):(t.drawPoint(r.x,r.y,"#703778"),t.drawLine(r.x,r.y,n.x,n.y,"#703778"),t.labelPoint(r.x,r.y,"end","#703778"),APIBuilder.addCoordinateParameters("end_x",r.x,"end_y",r.y),e="start")}},sweepCoords=$("#sweep-start-end"),sweepCoordsCanvas=new Canvas(sweepCoords.find("canvas").get()[0]);sweepCoords.on("click",setSweepCoordinates(sweepCoordsCanvas));