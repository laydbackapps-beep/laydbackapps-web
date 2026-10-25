
    (function(){
      'use strict';
      document.documentElement.classList.add('js');
      function heroCanvas(){
        var c=document.getElementById('hero-canvas'); if(!c) return;
        var ctx=c.getContext('2d'); var dpr=window.devicePixelRatio||1;
        function resize(){
          var r=c.getBoundingClientRect();
          c.width=r.width*dpr; c.height=r.height*dpr;
          ctx.scale(dpr,dpr); c.style.width=r.width+'px'; c.style.height=r.height+'px';
        }
        var prefersReduced=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
        var traceProg=0; var traceTarget=1; var colsProg=0; var colsTarget=1;
        var startTime=performance.now();
        function drawTrace(t){
          var w=c.width/dpr; var h=c.height/dpr;
          ctx.clearRect(0,0,w,h);
          ctx.strokeStyle='#3f88a8'; ctx.lineWidth=2; ctx.lineCap='round';
          ctx.beginPath();
          var y0=h*0.55; var y1=h*0.45;
          var steps=80;
          for(var i=0;i<=steps;i++){
            var x=(i/steps)*w;
            var wave=Math.sin(i*0.15)*12*(1-t);
            var y=y0+(y1-y0)*(i/steps)+wave*(1-t);
            if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
          }
          ctx.stroke();
        }
        function drawCols(t){
          var w=c.width/dpr; var h=c.height/dpr;
          var baseline=h*0.72;
          ctx.fillStyle='#2c5d7c';
          var clusters=[{x:w*0.15,n:5},{x:w*0.35,n:7},{x:w*0.55,n:4},{x:w*0.75,n:6},{x:w*0.9,n:3}];
          clusters.forEach(function(cl){
            for(var i=0;i<cl.n;i++){
              var hgt=(30+Math.random()*80)*t;
              var x=cl.x+(i-(cl.n-1)/2)*10;
              ctx.fillRect(x-2,baseline-hgt,4,hgt);
            }
          });
        }
        function frame(now){
          var elapsed=(now-startTime)/1000;
          if(!prefersReduced){
            traceProg=Math.min(1,elapsed/1.5);
            colsProg=Math.min(1,Math.max(0,(elapsed-0.4)/1.2));
          }else{
            traceProg=1; colsProg=1;
          }
          drawTrace(traceProg);
          drawCols(colsProg);
          if(traceProg<1 || colsProg<1) requestAnimationFrame(frame);
        }
        resize(); window.addEventListener('resize',resize);
        if(prefersReduced){ drawTrace(1); drawCols(1); }
        else requestAnimationFrame(frame);
      }
      function processTrace(){
        var c=document.getElementById('process-trace'); if(!c) return;
        var ctx=c.getContext('2d'); var dpr=window.devicePixelRatio||1;
        function resize(){
          var r=c.getBoundingClientRect();
          c.width=r.width*dpr; c.height=r.height*dpr;
          ctx.scale(dpr,dpr); c.style.width=r.width+'px'; c.style.height=r.height+'px';
          draw();
        }
        var prefersReduced=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
        function draw(){
          var w=c.width/dpr; var h=c.height/dpr;
          ctx.clearRect(0,0,w,h);
          var steps=c.querySelectorAll('.step');
          if(steps.length<2) return;
          var centers=Array.from(steps).map(function(s){
            var r=s.getBoundingClientRect(); var cr=c.getBoundingClientRect();
            return {x:r.left+ r.width/2 - cr.left, y:r.top + 40 - cr.top};
          });
          ctx.strokeStyle='#3f88a8'; ctx.lineWidth=2; ctx.lineCap='round';
          ctx.beginPath();
          centers.forEach(function(p,i){
            if(i===0) ctx.moveTo(p.x,p.y);
            else{
              var prev=centers[i-1];
              var cx=(prev.x+p.x)/2;
              ctx.bezierCurveTo(cx,prev.y,cx,p.y,p.x,p.y);
            }
          });
          ctx.stroke();
          centers.forEach(function(p){
            ctx.fillStyle='#2c5d7c';
            ctx.beginPath(); ctx.arc(p.x,p.y,4,0,Math.PI*2); ctx.fill();
          });
        }
        resize(); window.addEventListener('resize',resize);
      }
      function reveal(){
        var els=document.querySelectorAll('.rv');
        var io=new IntersectionObserver(function(entries){
          entries.forEach(function(e){
            if(e.isIntersecting){ e.target.classList.add('on'); io.unobserve(e.target); }
          });
        },{threshold:0.1,rootMargin:'0px 0px -50px 0px'});
        els.forEach(function(el){ io.observe(el); });
      }
      function mobileNav(){
        var burger=document.querySelector('.burger');
        var menu=document.getElementById('mobile-menu');
        var links=menu?menu.querySelectorAll('a'):[];
        if(!burger || !menu) return;
        burger.addEventListener('click',function(){
          var open=burger.getAttribute('aria-expanded')==='true';
          burger.setAttribute('aria-expanded',!open);
          menu.style.display=open?'none':'block';
        });
        links.forEach(function(a){ a.addEventListener('click',function(){
          burger.setAttribute('aria-expanded','false'); menu.style.display='none';
        }); });
        window.addEventListener('resize',function(){
          if(window.innerWidth>=600){ burger.setAttribute('aria-expanded','false'); menu.style.display='none'; }
        });
      }
      function init(){
        heroCanvas(); processTrace(); reveal(); mobileNav();
        setTimeout(function(){
          document.documentElement.classList.add('loaded');
          document.querySelectorAll('.rv').forEach(function(el){ el.classList.add('on'); });
        },1100);
      }
      if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
      else init();
    })();
  