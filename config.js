'use strict';

const SUPABASE_URL = 'https://yeoccpkjhpgtmfsrabxy.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_rlhJUBPorEKqKLUgClj30Q_7EhBXUEd';
const SUPABASE_PROJECT_ID = 'yeoccpkjhpgtmfsrabxy';

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// Fallback for storefront data: if app.js is delayed or fails before loadStore(),
// Products and Videos still get a clear result instead of an infinite loader.
(function(){
  const esc = (v='') => String(v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const images = p => {
    let list=[];
    if(Array.isArray(p.image_urls)) list=p.image_urls;
    else if(typeof p.image_urls==='string'){try{list=JSON.parse(p.image_urls)||[]}catch{list=p.image_urls.split(',').map(x=>x.trim()).filter(Boolean)}}
    if(p.image_url&&!list.includes(p.image_url))list.unshift(p.image_url);
    return list.filter(Boolean);
  };
  const imageFor=p=>images(p)[0]||'product-placeholder.svg';
  const card=p=>`<article class="productCard"><div class="imageWrap"><img src="${esc(imageFor(p))}" alt="${esc(p.name||'Product')}" loading="lazy" onerror="this.src='product-placeholder.svg'"></div><div class="cardBody"><small>${esc(p.category||'Ethnic Wear')}</small><h3>${esc(p.name||'Product')}</h3><div class="priceRow"><span class="price">₹${Number(p.price||0).toLocaleString('en-IN')}</span>${Number(p.original_price)>Number(p.price)?`<del>₹${Number(p.original_price).toLocaleString('en-IN')}</del>`:''}</div><p class="stock ${Number(p.stock||0)>0?'in':'out'}">${Number(p.stock||0)>0?`${Number(p.stock)} in stock`:'Ask availability'}</p><div class="cardActions"><a class="primaryBtn" target="_blank" rel="noopener" href="https://wa.me/918141152565?text=${encodeURIComponent(`Hello Tanisha Ethnic, I want to order ${p.name||'this product'}. Price ₹${p.price||0}. Please confirm size, colour and availability.`)}">WhatsApp</a></div></div></article>`;
  async function fallback(){
    const status=document.getElementById('statusText'),grid=document.getElementById('productGrid'),newGrid=document.getElementById('newGrid'),bestGrid=document.getElementById('bestGrid'),trend=document.getElementById('trendingGrid'),videos=document.getElementById('videoGrid');
    try{
      const [pr,vr]=await Promise.all([
        supabaseClient.from('products').select('*').eq('active',true).order('featured',{ascending:false}).order('created_at',{ascending:false}),
        supabaseClient.from('videos').select('*').eq('active',true).order('created_at',{ascending:false})
      ]);
      if(pr.error)throw pr.error;
      const ps=pr.data||[];
      if(grid&&(!grid.children.length||/Loading products/i.test(status?.textContent||'')))grid.innerHTML=ps.map(card).join('')||'<p class="empty">Abhi koi active product available nahi hai.</p>';
      if(newGrid&&!newGrid.children.length)newGrid.innerHTML=ps.slice(0,4).map(card).join('')||'<p class="empty">No new products yet.</p>';
      if(bestGrid&&!bestGrid.children.length)bestGrid.innerHTML=ps.filter(p=>p.featured).slice(0,4).map(card).join('')||ps.slice(0,4).map(card).join('')||'<p class="empty">No best sellers yet.</p>';
      if(trend&&!trend.children.length)trend.innerHTML=ps.slice(0,4).map(card).join('')||'<p class="empty">No trending products yet.</p>';
      if(status&&/Loading products/i.test(status.textContent||''))status.textContent=ps.length?'':'Abhi koi active product available nahi hai.';
      if(videos){
        if(vr.error)videos.innerHTML='<div class="videoEmpty"><b>Videos unavailable</b><p>Supabase videos table se data load nahi ho paaya.</p></div>';
        else {const vs=vr.data||[];videos.innerHTML=vs.map(v=>`<article class="videoCard"><div class="videoFrame"><video controls playsinline preload="metadata" poster="${esc(v.poster_url||'brand-round.png')}"><source src="${esc(v.video_url||'')}"></video></div><div class="videoMeta"><small>${esc(v.category||'TANISHA ETHNIC')}</small><h3>${esc(v.title||'Latest Video')}</h3>${v.caption?`<p>${esc(v.caption)}</p>`:''}</div></article>`).join('')||'<div class="videoEmpty"><b>New videos coming soon</b><p>Admin Panel → Videos se MP4 upload karein.</p></div>'}
      }
    }catch(error){
      console.error('Tanisha Ethnic fallback load failed:',error);
      if(status&&/Loading products/i.test(status.textContent||''))status.textContent=`Products load nahi hue: ${error.message||error}`;
      if(videos&&/Videos loading/i.test(videos.textContent||''))videos.innerHTML='<div class="videoEmpty"><b>Videos unavailable</b><p>Supabase se videos load nahi ho paaye.</p></div>';
    }
  }
  setTimeout(fallback,2500);
})();
