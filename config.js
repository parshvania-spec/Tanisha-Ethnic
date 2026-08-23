'use strict';

const SUPABASE_URL = 'https://yeoccpkjhpgtmfsrabxy.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_rlhJUBPorEKqKLUgClj30Q_7EhBXUEd';
const SUPABASE_PROJECT_ID = 'yeoccpkjhpgtmfsrabxy';

// Keep the normal Supabase client when the CDN library is available.
// If the CDN is blocked/delayed on a device, use a small REST compatibility
// client so the public storefront can still load Products and Videos.
function teRestRequest(table, params={}) {
  const qs = new URLSearchParams(params).toString();
  return fetch(`${SUPABASE_URL}/rest/v1/${table}${qs?'?'+qs:''}`, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      Accept: 'application/json'
    },
    cache: 'no-store'
  }).then(async response => {
    const text = await response.text();
    let data=null;
    try { data=text?JSON.parse(text):null; } catch { data=null; }
    if(!response.ok) {
      const message=data?.message||data?.hint||`HTTP ${response.status}`;
      throw new Error(`${table}: ${message}`);
    }
    return data;
  });
}

function makeRestClient(){
  const from = table => {
    const state={table, params:{select:'*'}};
    const builder={
      select(columns='*'){state.params.select=columns;return builder;},
      eq(column,value){state.params[`${column}`]=`eq.${value}`;return builder;},
      order(column,opts={}){state.params.order=`${column}.${opts.ascending===false?'desc':'asc'}`;return builder;},
      limit(n){state.params.limit=String(n);return builder;},
      maybeSingle(){return teRestRequest(state.table,state.params).then(rows=>({data:Array.isArray(rows)?(rows[0]||null):rows,error:null})).catch(error=>({data:null,error}));},
      then(resolve,reject){return teRestRequest(state.table,state.params).then(data=>({data,error:null})).catch(error=>({data:null,error})).then(resolve,reject);}
    };
    return builder;
  };
  return {from};
}

const supabaseClient = (window.supabase && typeof window.supabase.createClient==='function')
  ? window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})
  : makeRestClient();

// Independent public-store fallback. This does not depend on Supabase JS.
(function(){
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const img=p=>{
    let a=[];
    if(Array.isArray(p.image_urls)) a=p.image_urls;
    else if(typeof p.image_urls==='string'){try{a=JSON.parse(p.image_urls)||[]}catch{a=p.image_urls.split(',').map(x=>x.trim()).filter(Boolean)}}
    if(p.image_url&&!a.includes(p.image_url))a.unshift(p.image_url);
    return a[0]||'product-placeholder.svg';
  };
  const card=p=>`<article class="productCard"><div class="imageWrap"><img src="${esc(img(p))}" alt="${esc(p.name||'Product')}" loading="lazy" onerror="this.src='product-placeholder.svg'"></div><div class="cardBody"><small>${esc(p.category||'Ethnic Wear')}</small><h3>${esc(p.name||'Product')}</h3><div class="priceRow"><span class="price">₹${Number(p.price||0).toLocaleString('en-IN')}</span></div><p class="stock ${Number(p.stock||0)>0?'in':'out'}">${Number(p.stock||0)>0?`${Number(p.stock)} in stock`:'Ask availability'}</p></div></article>`;
  async function fallback(){
    const status=document.getElementById('statusText');
    const grid=document.getElementById('productGrid');
    const videoGrid=document.getElementById('videoGrid');
    try{
      const [products,videos]=await Promise.all([
        teRestRequest('products',{select:'*',active:'eq.true',order:'featured.desc,created_at.desc'}),
        teRestRequest('videos',{select:'*',active:'eq.true',order:'created_at.desc'})
      ]);
      if(grid && (grid.children.length===0 || /Loading products/i.test(status?.textContent||''))) grid.innerHTML=(products||[]).map(card).join('')||'<p class="empty">Abhi koi active product available nahi hai.</p>';
      if(status && /Loading products/i.test(status.textContent||'')) status.textContent=products?.length?'': 'Abhi koi active product available nahi hai.';
      if(videoGrid && /Videos loading/i.test(videoGrid.textContent||'')) videoGrid.innerHTML=(videos||[]).map(v=>`<article class="videoCard"><div class="videoFrame"><video controls playsinline preload="metadata" poster="${esc(v.poster_url||'brand-round.png')}"><source src="${esc(v.video_url||'')}"></video></div><div class="videoMeta"><small>${esc(v.category||'TANISHA ETHNIC')}</small><h3>${esc(v.title||'Latest Video')}</h3></div></article>`).join('')||'<div class="videoEmpty"><b>New videos coming soon</b><p>Admin Panel → Videos se MP4 upload karein.</p></div>';
    }catch(error){
      console.error('Tanisha Ethnic REST fallback:',error);
      if(status && /Loading products/i.test(status.textContent||'')) status.textContent=`Products error: ${error.message||error}`;
      if(videoGrid && /Videos loading/i.test(videoGrid.textContent||'')) videoGrid.innerHTML=`<div class="videoEmpty"><b>Videos error</b><p>${esc(error.message||error)}</p></div>`;
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(fallback,1800),{once:true});else setTimeout(fallback,1800);
})();
