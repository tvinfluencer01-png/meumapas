/**
 * GET /api/public/affiliate/sdk.js
 * SDK universal servido como text/javascript. Uso:
 *   <script src="https://SEUDOMINIO/api/public/affiliate/sdk.js" data-slug="AFF" async></script>
 */
import { createFileRoute } from "@tanstack/react-router";

const SDK = `(function(){
  var g = window; if (g.__aff_sdk) return; g.__aff_sdk = true;
  var script = document.currentScript;
  var slug = script && script.getAttribute("data-slug");
  var api = (script && script.getAttribute("data-endpoint")) || (location.origin + "/api/public/affiliate/collect");
  function rid(){ return Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function get(name){ var m = document.cookie.match(new RegExp("(?:^|; )"+name+"=([^;]*)")); return m ? decodeURIComponent(m[1]) : null; }
  function set(name,val,days){
    var d = new Date(); d.setTime(d.getTime()+days*86400000);
    document.cookie = name+"="+encodeURIComponent(val)+"; expires="+d.toUTCString()+"; path=/; SameSite=Lax";
  }
  var visitorId = get("_aff_vid") || rid(); set("_aff_vid", visitorId, 365);
  var sessionKey = sessionStorage.getItem("_aff_sk"); if (!sessionKey){ sessionKey = rid(); sessionStorage.setItem("_aff_sk", sessionKey); }
  var q = new URLSearchParams(location.search);
  function post(payload){
    try { navigator.sendBeacon(api, new Blob([JSON.stringify(payload)], { type: "application/json" })); }
    catch(e){ fetch(api, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload), keepalive:true }).catch(function(){}); }
  }
  post({
    action:"session", sessionKey: sessionKey, visitorId: visitorId,
    referrer: document.referrer || null, landingUrl: location.href,
    language: navigator.language, screenResolution: screen.width+"x"+screen.height,
    utm: { source: q.get("utm_source"), medium: q.get("utm_medium"), campaign: q.get("utm_campaign"), content: q.get("utm_content"), term: q.get("utm_term") },
    clickIds: { fbclid: q.get("fbclid"), gclid: q.get("gclid"), ttclid: q.get("ttclid"), msclkid: q.get("msclkid"), li_fat_id: q.get("li_fat_id"), epik: q.get("epik") },
    affiliateSlug: q.get("ref") || slug || null
  });
  function evt(name, extra){ post(Object.assign({ action:"event", sessionKey: sessionKey, name: name, pageUrl: location.href, pageTitle: document.title }, extra||{})); }
  evt("page_view");
  var startedAt = Date.now(); var maxScroll = 0;
  window.addEventListener("scroll", function(){
    var h = document.documentElement; var pct = Math.round(((h.scrollTop + window.innerHeight) / h.scrollHeight) * 100);
    if (pct > maxScroll){ maxScroll = pct; if (pct % 25 === 0) evt("scroll", { properties: { pct: pct } }); }
  }, { passive: true });
  setInterval(function(){ evt("heartbeat", { properties: { seconds: 15 } }); }, 15000);
  window.addEventListener("beforeunload", function(){
    evt("session_end", { properties: { seconds: Math.round((Date.now()-startedAt)/1000), maxScroll: maxScroll } });
  });
  g.aff = {
    track: function(name, props, valueCents, currency){ evt(name, { category: "custom", properties: props||{}, valueCents: valueCents||null, currency: currency||"BRL" }); },
    checkout: function(props){ evt("checkout", { category: "commerce", properties: props||{} }); },
    purchase: function(valueCents, props){ evt("purchase", { category: "commerce", valueCents: valueCents, properties: props||{} }); },
    abandon: function(props){ evt("cart_abandon", { category: "commerce", properties: props||{} }); }
  };
})();`;

export const Route = createFileRoute("/api/public/affiliate/sdk/js")({
  server: {
    handlers: {
      GET: async () =>
        new Response(SDK, {
          status: 200,
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "Access-Control-Allow-Origin": "*",
          },
        }),
    },
  },
});
