'use strict';
let products=[],offers=[],reviews=[],videos=[],coupons=[],activeCategory='All',activeFabric='All',activeColor='All',currentProduct=null,currentProductImages=[],currentImageIndex=0,currentSlide=0,slideTimer=null,deferredPrompt=null;
let storeSettings={store_name:'Tanisha Ethnic',whatsapp_number:'918141152565',instagram_url:'https://www.instagram.com/tanisha.ethnic/',announcement_text:'Welcome to Tanisha Ethnic'};
const fallbackImage='product-placeholder.svg';
const el=id=>document.getElementById(id);
const esc=(v='')=>String(v).replace(/[&<>\'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const cleanPhone=n=>String(n||'').replace(/\D/g,'');
const discount=p=>Number(p.original_price)>Number(p.price)?Math.round((Number(p.original_price)-Number(p.price))*100/Number(p.original_price)):0;
const wishlist=()=>{try{return JSON.parse(localStorage.getItem('te_wishlist_v3')||localStorage.getItem('te_wishlist')||'[]').map(String)}catch{return []}};
const cart=()=>{try{return JSON.parse(localStorage.getItem('te_cart_v4')||'[]')}catch{return []}};
const recent=()=>{try{return JSON.parse(localStorage.getItem('te_recent_v4')||'[]').map(String)}catch{return []}};
const isWished=id=>wishlist().includes(String(id));
const toast=msg=>{el('toast').textContent=msg;el('toast').classList.add('show');setTimeout(()=>el('toast').classList.remove('show'),2200)};
const getImages=p=>{let a=[];if(Array.isArray(p.image_urls))a=p.image_urls;if(typeof p.image_urls==='string'){try{a=JSON.parse(p.image_urls)||[]}catch{a=p.image_urls.split(',').map(x=>x.trim()).filter(Boolean)}}if(p.image_url&&!a.includes(p.image_url))a.unshift(p.image_url);return a.filter(Boolean).length?a.filter(Boolean):[fallbackImage]};

const splitList=v=>String(v||'').split(/[,|/]/).map(x=>x.trim()).filter(Boolean);
const productFabric=p=>p.fabric||splitList(p.description).find(x=>/silk|cotton|rayon|linen|georgette|chanderi|organza/i.test(x))||'Premium fabric';
const isNewProduct=p=>{if(!p.created_at)return false;const age=(Date.now()-new Date(p.created_at).getTime())/86400000;return age>=0&&age<=30};
const deliveryWindow=()=>{const fmt=d=>d.toLocaleDateString('en-IN',{day:'numeric',month:'short'}),a=new Date(),b=new Date();a.setDate(a.getDate()+3);b.setDate(b.getDate()+7);return `${fmt(a)} – ${fmt(b)}`};
const productBadges=p=>{const out=[],stock=Number(p.stock||0),off=discount(p);if(stock<=0)out.push('<span class="statusBadge outBadge">Out of Stock</span>');else if(isNewProduct(p))out.push('<span class="statusBadge newBadge">New</span>');if(off)out.push(`<span class="statusBadge saleBadge">Sale ${off}%</span>`);return out.join('')};
function renderSearchSuggestions(){const d=el('searchSuggestions');if(!d)return;const values=[...new Set(products.flatMap(p=>[p.name,p.design_number,p.category,productFabric(p),...splitList(p.colors)]).filter(Boolean))].slice(0,100);d.innerHTML=values.map(v=>`<option value="${esc(v)}"></option>`).join('')}

const activeCouponFor=(code,subtotal)=>{const now=new Date().toISOString().slice(0,10),c=coupons.find(x=>String(x.code||'').toUpperCase()===String(code||'').toUpperCase());if(!c||!c.active)return {error:'Invalid coupon code'};if(c.start_date&&c.start_date>now)return {error:'Coupon abhi active nahi hua'};if(c.end_date&&c.end_date<now)return {error:'Coupon expire ho chuka hai'};if(subtotal<Number(c.minimum_order??c.min_order??0))return {error:`Minimum order ₹${Number(c.minimum_order).toLocaleString('en-IN')} required`};let discount=0,shippingFree=false;if(['percent','percentage'].includes(c.discount_type))discount=subtotal*Number(c.discount_value||0)/100;if(c.discount_type==='fixed')discount=Number(c.discount_value||0);if(c.discount_type==='free_shipping')shippingFree=true;const cap=c.maximum_discount??c.max_discount;if(cap)discount=Math.min(discount,Number(cap));discount=Math.min(subtotal,Math.round(discount));return {coupon:c,discount,shippingFree,total:subtotal-discount}};
const restoreCouponInput=()=>{const code=coupon();if(el('couponInput'))el('couponInput').value=code};
const coupon=()=>localStorage.getItem('te_coupon_v2')||'';
const whatsappLink=p=>`https://wa.me/${cleanPhone(storeSettings.whatsapp_number)}?text=${encodeURIComponent(`Hello ${storeSettings.store_name}, I want to order ${p.name}${p.design_number?` (Design ${p.design_number})`:''}. Price ₹${p.price}. Please share size, colour and availability.`)}`;
const productUrl=p=>{const u=new URL(location.origin+'/');u.searchParams.set('product',String(p.id));return u.toString()};
const updateProductUrl=id=>{const u=new URL(location.href);if(id)u.searchParams.set('product',String(id));else u.searchParams.delete('product');history.replaceState(null,'',u.pathname+u.search+u.hash)};
function openSharedProduct(){const id=new URLSearchParams(location.search).get('product');if(id&&products.some(p=>String(p.id)===String(id)))openProduct(id,true)}
function setWishlist(list){localStorage.setItem('te_wishlist_v3',JSON.stringify([...new Set(list.map(String))]));renderAll();renderWishlist();updateModalWish()}
function toggleWish(id){const s=String(id),w=wishlist();const added=!w.includes(s);setWishlist(added?[...w,s]:w.filter(x=>x!==s));toast(added?'Added to wishlist':'Removed from wishlist')}
async function loadStore(){
  const status=el('statusText');
  if(status) status.textContent='Loading products…';

  try{
    const results=await Promise.allSettled([
      supabaseClient.from('site_settings').select('*').order('id').limit(1).maybeSingle(),
      supabaseClient.from('offers').select('*').eq('active',true).order('created_at',{ascending:false}),
      supabaseClient.from('products').select('*').eq('active',true).order('featured',{ascending:false}).order('created_at',{ascending:false}),
      supabaseClient.from('reviews').select('*').eq('approved',true).order('created_at',{ascending:false}).limit(12),
      supabaseClient.from('videos').select('*').eq('active',true).order('created_at',{ascending:false}),
      supabaseClient.from('coupons').select('*').eq('active',true).order('created_at',{ascending:false})
    ]);

    const value=i=>results[i]?.status==='fulfilled'
      ? results[i].value
      : {data:null,error:results[i]?.reason||new Error('Request failed')};

    const s=value(0);
    const o=value(1);
    const p=value(2);
    const r=value(3);
    const v=value(4);
    const c=value(5);

    if(s.data) storeSettings={...storeSettings,...s.data};

    storeSettings.store_name='Tanisha Ethnic';

    if(
      !storeSettings.announcement_text ||
      /Tanisha Ethnic/i.test(storeSettings.announcement_text)
    ){
      storeSettings.announcement_text='Welcome to Tanisha Ethnic';
    }

    offers=o.data||[];
    products=p.data||[];
    reviews=r.data||[];
    videos=v.data||[];
    coupons=c.data||[];

    applySettings();
    renderHero();

    try{
      renderAll();
      renderWishlist();
      renderReviews();
      renderVideos(v.error);
      restoreCouponInput();
    }catch(renderError){
      console.error(
        'Tanisha Ethnic render error:',
        renderError
      );

      if(status){
        status.textContent=
          `Website render error: ${
            renderError.message||renderError
          }`;
      }

      return;
    }

    if(status){
      if(p.error){
        status.textContent=
          `Products load nahi hue: ${
            p.error.message||p.error
          }`;
      }else if(products.length){
        status.textContent='';
      }else{
        status.textContent=
          'Abhi koi product add nahi kiya gaya hai.';
      }
    }

    openSharedProduct();

  }catch(error){

    console.error(
      'Tanisha Ethnic store loading error:',
      error
    );

    if(status){
      status.textContent=
        `Store load error: ${
          error.message||error
        }`;
    }
  }
}
function renderVideos(error){
  const grid=el('videoGrid'); if(!grid)return;
  const cta=el('videoInstagramCta'); if(cta)cta.href=storeSettings.instagram_url||'https://www.instagram.com/tanisha.ethnic/';
  if(error){grid.innerHTML=`<div class="videoEmpty"><b>Videos setup required</b><p>Admin me video upload enable karne ke liye V30 setup.sql isi connected Supabase project me ek baar run karein.</p></div>`;return}
  grid.innerHTML=videos.map(v=>`<article class="videoCard"><div class="videoFrame"><video controls playsinline preload="metadata" poster="${esc(v.poster_url||'brand-round.png')}"><source src="${esc(v.video_url)}"></video></div><div class="videoMeta"><small>${esc(v.category||'TANISHA ETHNIC')}</small><h3>${esc(v.title||'Latest Video')}</h3>${v.caption?`<p>${esc(v.caption)}</p>`:''}</div></article>`).join('')||`<div class="videoEmpty"><b>New videos coming soon</b><p>Admin Panel → Videos se MP4 upload karein.</p></div>`;
}

function applySettings(){el('offerBar').textContent=storeSettings.announcement_text||'Welcome to Tanisha Ethnic';el('footerStore').textContent=storeSettings.store_name;const ig=storeSettings.instagram_url||'#',ph=cleanPhone(storeSettings.whatsapp_number),wa=`https://wa.me/${ph}`;['instagramTop','instagramFooter','menuInstagram','instagramCta'].forEach(i=>el(i)&& (el(i).href=ig));['whatsappTop','whatsappContact','whatsappFooter','floatingWa','menuWhatsApp','storyWhatsApp','newsletterWa'].forEach(i=>el(i)&& (el(i).href=wa));['phoneTop','phoneFooter'].forEach(i=>el(i).href=`tel:+${ph}`);const formatted=ph.startsWith('91')?`+91 ${ph.slice(2,7)} ${ph.slice(7)}`:`+${ph}`;['whatsappNumberText','whatsappFooterText','phoneNumberText','phoneFooterText'].forEach(i=>el(i).textContent=formatted)}
function heroItems(){const now=new Date().toISOString().slice(0,10);const live=offers.filter(o=>(!o.start_date||o.start_date<=now)&&(!o.end_date||o.end_date>=now));const items=live.map((o,i)=>({title:o.title||'Special Offer',text:[o.subtitle,o.discount_text].filter(Boolean).join(' • '),image:o.banner_image||products[i%Math.max(products.length,1)]?.image_url||'brand-round.png'}));if(!items.length)items.push({title:'Grace in Every Detail',text:'Premium ethnic styles for everyday elegance and celebrations.',image:products[0]?.image_url||'brand-round.png'});return items}
function renderHero(){const items=heroItems();el('heroSlides').innerHTML=items.map((x,i)=>`<article class="slide ${i===0?'active':''}"><div class="slideText"><small>PREMIUM ETHNIC WEAR</small><h1>${esc(x.title)}</h1><p>${esc(x.text)}</p><div class="heroActions"><a class="primaryBtn" href="#shop">Shop Collection</a><a class="heroLink" href="#wishlist">View Wishlist</a></div></div><div class="slideVisual"><div class="heroGlow"></div><img src="${esc(x.image)}" alt="${esc(x.title)}" onerror="this.src='${fallbackImage}'"></div></article>`).join('');el('slideDots').innerHTML=items.map((_,i)=>`<button data-slide="${i}" class="${i===0?'active':''}" aria-label="Slide ${i+1}"></button>`).join('');currentSlide=0;restartSlider()}
function showSlide(i){const slides=[...document.querySelectorAll('.slide')],dots=[...el('slideDots').children];if(!slides.length)return;currentSlide=(i+slides.length)%slides.length;slides.forEach((s,n)=>s.classList.toggle('active',n===currentSlide));dots.forEach((d,n)=>d.classList.toggle('active',n===currentSlide))}
function restartSlider(){clearInterval(slideTimer);slideTimer=setInterval(()=>showSlide(currentSlide+1),5500)}
function card(p){const img=getImages(p)[0],off=discount(p),stock=Number(p.stock||0);return `<article class="productCard"><div class="imageWrap"><div class="statusBadges">${productBadges(p)}${p.featured?'<span class="statusBadge bestBadge">Best Seller</span>':''}</div><img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy" decoding="async" onerror="this.src='${fallbackImage}'"><button class="wishBtn ${isWished(p.id)?'active':''}" data-wish="${p.id}" aria-label="Wishlist">${isWished(p.id)?'♥':'♡'}</button></div><div class="cardBody"><small>${esc(p.category||'Ethnic Wear')}</small><h3>${esc(p.name||'Product')}</h3><div class="priceRow"><span class="price">₹${Number(p.price||0).toLocaleString('en-IN')}</span>${Number(p.original_price)>Number(p.price)?`<del>₹${Number(p.original_price).toLocaleString('en-IN')}</del>`:''}</div><div class="cardRating">★★★★★ <span>Premium pick</span></div><p class="stock ${stock>0?'in':'out'}">${stock>0?`${stock} in stock`:'Ask availability'}</p><div class="cardActions"><button class="secondaryBtn" data-id="${p.id}">View Details</button><a class="primaryBtn" target="_blank" rel="noopener" href="${esc(whatsappLink(p))}">WhatsApp</a></div><button class="addCartBtn" data-cart-add="${p.id}">🛒 Add to Cart</button></div></div></article>`}
function renderAll(){renderSearchSuggestions();el('newGrid').innerHTML=products.slice(0,4).map(card).join('')||'<p class="empty">No new products yet.</p>';let best=products.filter(p=>p.featured);if(!best.length)best=products.slice(0,4);el('bestGrid').innerHTML=best.slice(0,4).map(card).join('')||'<p class="empty">No best sellers yet.</p>';renderCategories();renderColorFilter();renderTrending();renderRecommendations();renderInstagram();renderProducts();renderCart();renderRecent();el('wishlistCount').textContent=wishlist().length;el('wishlistCount').classList.toggle('hidden',wishlist().length===0)}
function productText(p){return `${p.name||''} ${p.category||''} ${p.description||''} ${p.design_number||''} ${p.colors||''} ${p.fabric||''} ${p.work||''}`.toLowerCase()}
function renderTrending(){const list=[...products].sort((a,b)=>(Number(b.featured)-Number(a.featured))||(discount(b)-discount(a))).slice(0,4);el('trendingGrid').innerHTML=list.map(card).join('')||'<p class="empty">Trending products will appear here.</p>'}
function renderCategories(){const cats=['All',...new Set(products.map(p=>p.category).filter(Boolean))];el('categoryButtons').innerHTML=cats.map(c=>`<button class="${c===activeCategory?'active':''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
function renderColorFilter(){const select=el('colorFilter');if(!select)return;const colors=[...new Set(products.flatMap(p=>splitList(p.colors)).filter(Boolean))];const value=activeColor;select.innerHTML='<option value="All">All Colours</option>'+colors.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');select.value=colors.includes(value)?value:'All'}
function renderRecommendations(){const wished=wishlist();let list=products.filter(p=>wished.includes(String(p.id)));const cats=new Set(list.map(p=>p.category));let rec=products.filter(p=>cats.has(p.category)&&!wished.includes(String(p.id)));if(!rec.length)rec=[...products].sort((a,b)=>Number(b.featured)-Number(a.featured));el('recommendGrid').innerHTML=rec.slice(0,4).map(card).join('')||'<p class="empty">Recommended products will appear here.</p>'}
function renderInstagram(){const list=products.slice(0,8);el('instagramGrid').innerHTML=list.map(p=>`<a href="${esc(storeSettings.instagram_url||'#')}" target="_blank" rel="noopener"><img src="${esc(getImages(p)[0])}" alt="${esc(p.name)}" loading="lazy"><span>View style</span></a>`).join('')||'<p class="empty">Instagram collection coming soon.</p>'}
function renderProducts(){let list=[...products];if(activeCategory!=='All')list=list.filter(p=>p.category===activeCategory);if(activeFabric!=='All')list=list.filter(p=>productText(p).includes(activeFabric.toLowerCase()));if(activeColor!=='All')list=list.filter(p=>splitList(p.colors).some(c=>c.toLowerCase()===activeColor.toLowerCase())||productText(p).includes(activeColor.toLowerCase()));const pf=el('priceFilter').value;if(pf==='under1000')list=list.filter(p=>Number(p.price)<1000);if(pf==='1000to2000')list=list.filter(p=>Number(p.price)>=1000&&Number(p.price)<=2000);if(pf==='above2000')list=list.filter(p=>Number(p.price)>2000);const q=el('search').value.trim().toLowerCase();if(q)list=list.filter(p=>productText(p).includes(q));const sort=el('sort').value;if(sort==='new')list.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));if(sort==='low')list.sort((a,b)=>Number(a.price)-Number(b.price));if(sort==='high')list.sort((a,b)=>Number(b.price)-Number(a.price));if(sort==='discount')list.sort((a,b)=>discount(b)-discount(a));el('productGrid').innerHTML=list.map(card).join('')||'<p class="empty">No matching products.</p>'}
function renderWishlist(){const ids=wishlist(),list=products.filter(p=>ids.includes(String(p.id)));el('wishlistGrid').innerHTML=list.map(card).join('')||'<div class="emptyState"><b>Your wishlist is empty</b><p>Products par heart dabakar yahan save karein.</p><a class="primaryBtn" href="#shop">Start Shopping</a></div>';el('clearWishlist').classList.toggle('hidden',!ids.length);el('wishlistCount').textContent=ids.length}
function openProduct(id,fromSharedLink=false){const p=products.find(x=>String(x.id)===String(id));if(!p)return;if(!fromSharedLink)updateProductUrl(p.id);const r=[String(id),...recent().filter(x=>x!==String(id))].slice(0,8);localStorage.setItem('te_recent_v4',JSON.stringify(r));renderRecent();currentProduct=p;currentProductImages=getImages(p);currentImageIndex=0;const imgs=currentProductImages,off=discount(p);el('modalImage').src=imgs[0];el('modalCategory').textContent=p.category||'Ethnic Wear';el('modalName').textContent=p.name||'';el('modalDescription').textContent=p.description||'Premium ethnic wear by Tanisha Ethnic.';el('modalDesign').textContent=p.design_number||'—';el('modalSizes').textContent=p.sizes||'Ask on WhatsApp';el('modalColors').textContent=p.colors||'Ask on WhatsApp';el('modalFabric').textContent=productFabric(p);el('modalWork').textContent=p.work||'Premium detailing';el('modalWash').textContent=p.wash_care||'Gentle hand wash / dry clean';el('modalStock').textContent=Number(p.stock||0)>0?`${p.stock} in stock`:'Out of stock — WhatsApp for restock';el('modalDelivery').textContent=deliveryWindow();el('modalPrice').textContent=`₹${Number(p.price||0).toLocaleString('en-IN')}`;el('modalMrp').textContent=Number(p.original_price)>Number(p.price)?`₹${Number(p.original_price).toLocaleString('en-IN')}`:'';el('modalDiscount').textContent=off?`${off}% OFF`:'';el('modalOrder').href=whatsappLink(p);const unavailable=Number(p.stock||0)<=0;el('modalCart').disabled=unavailable;el('modalCart').textContent=unavailable?'Out of Stock':'Add to Cart';el('modalOrder').textContent=unavailable?'Ask on WhatsApp':'Order on WhatsApp';el('thumbs').innerHTML=imgs.map((u,i)=>`<button class="thumbBtn ${i===0?'active':''}" data-thumb-index="${i}" aria-label="View image ${i+1}"><img src="${esc(u)}" alt="Product image ${i+1}" onerror="this.src='${fallbackImage}'"></button>`).join('');updateGalleryImage(0);const related=products.filter(x=>String(x.id)!==String(p.id)&&(x.category===p.category||productFabric(x)===productFabric(p))).slice(0,3);el('relatedGrid').innerHTML=related.map(x=>`<article class="relatedMini" data-id="${x.id}"><img src="${esc(getImages(x)[0])}" alt="${esc(x.name)}"><div><b>${esc(x.name)}</b><span>₹${Number(x.price||0).toLocaleString('en-IN')}</span></div></article>`).join('');updateModalWish();el('modal').classList.add('open');el('modal').setAttribute('aria-hidden','false');document.body.classList.add('noScroll')}
function closeProduct(){el('modal').classList.remove('open');el('modal').setAttribute('aria-hidden','true');document.body.classList.remove('noScroll');currentProduct=null;currentProductImages=[];currentImageIndex=0;updateProductUrl(null)}
function updateGalleryImage(index){if(!currentProductImages.length)return;currentImageIndex=(index+currentProductImages.length)%currentProductImages.length;const src=currentProductImages[currentImageIndex];el('modalImage').src=src;el('zoomImage').src=src;const label=`${currentImageIndex+1} / ${currentProductImages.length}`;el('imageCounter').textContent=label;el('zoomCounter').textContent=label;document.querySelectorAll('[data-thumb-index]').forEach((b,i)=>b.classList.toggle('active',i===currentImageIndex));const many=currentProductImages.length>1;['galleryPrev','galleryNext','zoomPrev','zoomNext'].forEach(id=>el(id).classList.toggle('hidden',!many))}
function openZoom(){if(!currentProductImages.length)return;updateGalleryImage(currentImageIndex);el('zoomOverlay').classList.add('open')}
function closeZoom(){el('zoomOverlay').classList.remove('open');const z=el('zoomImage');if(z){z.style.transform='scale(1)';z.classList.remove('isZoomed')}}

function updateModalWish(){if(!currentProduct)return;const active=isWished(currentProduct.id);el('wishlistModal').classList.toggle('active',active);el('wishlistModal').textContent=active?'♥ Saved':'♡ Wishlist'}

function setCart(items){localStorage.setItem('te_cart_v4',JSON.stringify(items));renderCart()}
function addToCart(id){const p=products.find(x=>String(x.id)===String(id));if(p&&Number(p.stock||0)<=0){toast('Product abhi out of stock hai');return}const items=cart(),found=items.find(x=>String(x.id)===String(id));if(found)found.qty=Math.min(10,Number(found.qty||1)+1);else items.push({id:String(id),qty:1});setCart(items);toast('Added to cart')}
function changeQty(id,d){const items=cart().map(x=>String(x.id)===String(id)?{...x,qty:Math.max(1,Number(x.qty||1)+d)}:x);setCart(items)}
function removeCart(id){setCart(cart().filter(x=>String(x.id)!==String(id)))}
function renderCart(){const items=cart(),rows=items.map(i=>{const p=products.find(x=>String(x.id)===String(i.id));if(!p)return '';return `<div class="cartItem"><img src="${esc(getImages(p)[0])}" alt="${esc(p.name)}"><div><h4>${esc(p.name)}</h4><p>${p.design_number?`Design ${esc(p.design_number)}`:''}</p><b>₹${Number(p.price||0).toLocaleString('en-IN')}</b><div class="qty"><button data-cart-qty="${p.id}" data-delta="-1">−</button><span>${Number(i.qty||1)}</span><button data-cart-qty="${p.id}" data-delta="1">+</button></div></div><button class="removeCart" data-cart-remove="${p.id}">Remove</button></div>`}).join('');el('cartItems').innerHTML=rows||'<div class="emptyCart"><b>Your cart is empty</b><p>Add products and order together on WhatsApp.</p><button id="continueShopping" class="primaryBtn" type="button">Continue Shopping</button></div>';
if(!rows){const c=el('continueShopping');if(c)c.onclick=()=>{closeCart();setTimeout(()=>el('shop').scrollIntoView({behavior:'smooth'}),80)}};const subtotal=items.reduce((sum,i)=>{const p=products.find(x=>String(x.id)===String(i.id));return sum+(p?Number(p.price||0)*Number(i.qty||1):0)},0);const applied=coupon()?activeCouponFor(coupon(),subtotal):null,total=applied&&!applied.error?applied.total:subtotal;el('cartSubtotal')&&(el('cartSubtotal').textContent=`₹${subtotal.toLocaleString('en-IN')}`);el('cartDiscountRow')&&el('cartDiscountRow').classList.toggle('hidden',!(applied&&!applied.error&&applied.discount>0));el('cartDiscount')&&(el('cartDiscount').textContent=`-₹${applied&&!applied.error?applied.discount.toLocaleString('en-IN'):0}`);el('cartTotal').textContent=`₹${total.toLocaleString('en-IN')}`;if(coupon()&&applied?.error){localStorage.removeItem('te_coupon_v2');if(el('couponStatus'))el('couponStatus').textContent=applied.error}const cartQty=items.reduce((a,b)=>a+Number(b.qty||1),0);el('cartCount').textContent=cartQty;el('bottomCartCount').textContent=cartQty;el('cartCount').classList.toggle('hidden',cartQty===0);el('bottomCartCount').classList.toggle('hidden',cartQty===0);el('clearCart').classList.toggle('hidden',!items.length);el('checkoutWa').disabled=!items.length}
function renderRecent(){const list=recent().map(id=>products.find(p=>String(p.id)===id)).filter(Boolean);el('recentGrid').innerHTML=list.map(card).join('')||'<p class="empty">Aap jo products dekhenge, woh yahan dikhenge.</p>'}
function openCart(){el('cartDrawer').classList.add('open');el('cartBackdrop').classList.add('open');el('cartDrawer').setAttribute('aria-hidden','false');document.body.classList.add('noScroll')}
function closeCart(){el('cartDrawer').classList.remove('open');el('cartBackdrop').classList.remove('open');el('cartDrawer').setAttribute('aria-hidden','true');document.body.classList.remove('noScroll')}
function cartWhatsApp(){const items=cart();if(!items.length)return;const lines=items.map((i,n)=>{const p=products.find(x=>String(x.id)===String(i.id));return p?`${n+1}. ${p.name}${p.design_number?` (Design ${p.design_number})`:''} × ${i.qty} — ₹${Number(p.price||0)*Number(i.qty||1)}`:''}).filter(Boolean);const subtotal=items.reduce((sum,i)=>{const p=products.find(x=>String(x.id)===String(i.id));return sum+(p?Number(p.price||0)*Number(i.qty||1):0)},0);const applied=coupon()?activeCouponFor(coupon(),subtotal):null,total=applied&&!applied.error?applied.total:subtotal;const couponLine=applied&&!applied.error?`\nCoupon: ${applied.coupon.code}${applied.discount?` (-₹${applied.discount})`:''}${applied.shippingFree?' (Free Shipping)':''}`:'';const msg=`Hello ${storeSettings.store_name}, I want to order:

${lines.join('\n')}

Total: ₹${total}
Please confirm size, colour, COD and delivery.`;window.open(`https://wa.me/${cleanPhone(storeSettings.whatsapp_number)}?text=${encodeURIComponent(msg)}`,'_blank','noopener')}

function renderReviews(){const avg=reviews.length?(reviews.reduce((s,r)=>s+Number(r.rating),0)/reviews.length).toFixed(1):'—';el('ratingSummary').innerHTML=reviews.length?`★ ${avg}/5 <span>(${reviews.length} approved reviews)</span>`:'No ratings yet';el('reviewGrid').innerHTML=reviews.length?reviews.map(r=>`<article class="reviewCard">${r.photo_url?`<img class="reviewPhoto" src="${esc(r.photo_url)}" alt="Customer review">`:''}<div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div><p>${esc(r.review_text)}</p><b>${esc(r.customer_name)}</b></article>`).join(''):'<p class="empty">Be the first to share a review.</p>'}
el('reviewForm').onsubmit=async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));const btn=e.target.querySelector('button');btn.disabled=true;btn.textContent='Submitting…';let photo_url=null;const file=e.target.elements.photo?.files?.[0];if(file){if(file.size>4*1024*1024){btn.disabled=false;btn.textContent='Submit Review';return toast('Photo 4 MB se chhoti honi chahiye')}const path=`reviews/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g,'-')}`;const up=await supabaseClient.storage.from('review-images').upload(path,file);if(up.error){btn.disabled=false;btn.textContent='Submit Review';return toast(up.error.message)}photo_url=supabaseClient.storage.from('review-images').getPublicUrl(path).data.publicUrl}const {error}=await supabaseClient.from('reviews').insert({customer_name:data.customer_name.trim(),review_text:data.review_text.trim(),rating:Number(data.rating),photo_url,approved:false});btn.disabled=false;btn.textContent='Submit Review';if(error)return toast(error.message);e.target.reset();toast('Thank you! Review approval ke baad dikhega.')};
document.addEventListener('click',e=>{const t=e.target.closest('[data-cat],[data-fabric],[data-id],[data-wish],[data-slide],[data-thumb-index],[data-cart-add],[data-cart-remove],[data-cart-qty]');if(!t)return;if(t.dataset.cat){activeCategory=t.dataset.cat;renderCategories();renderProducts()}if(t.dataset.fabric){activeFabric=t.dataset.fabric;document.querySelectorAll('[data-fabric]').forEach(b=>b.classList.toggle('active',b.dataset.fabric===activeFabric));renderProducts();document.getElementById('shop').scrollIntoView({behavior:'smooth'})}if(t.dataset.id)openProduct(t.dataset.id);if(t.dataset.wish)toggleWish(t.dataset.wish);if(t.dataset.slide!==undefined){showSlide(Number(t.dataset.slide));restartSlider()}if(t.dataset.cartAdd)addToCart(t.dataset.cartAdd);if(t.dataset.cartRemove)removeCart(t.dataset.cartRemove);if(t.dataset.cartQty)changeQty(t.dataset.cartQty,Number(t.dataset.delta));if(t.dataset.thumbIndex!==undefined)updateGalleryImage(Number(t.dataset.thumbIndex))});
el('search').oninput=renderProducts;el('sort').onchange=renderProducts;el('priceFilter').onchange=renderProducts;el('colorFilter').onchange=e=>{activeColor=e.target.value;renderProducts()};el('prevSlide').onclick=()=>{showSlide(currentSlide-1);restartSlider()};el('nextSlide').onclick=()=>{showSlide(currentSlide+1);restartSlider()};el('closeModal').onclick=closeProduct;el('modal').onclick=e=>{if(e.target===el('modal'))closeProduct()};el('wishlistModal').onclick=()=>currentProduct&&toggleWish(currentProduct.id);el('modalCart').onclick=()=>currentProduct&&addToCart(currentProduct.id);el('shareProduct').onclick=async()=>{if(!currentProduct)return;const design=currentProduct.design_number?` | Design ${currentProduct.design_number}`:'';const data={title:`${currentProduct.name} | Tanisha Ethnic`,text:`${currentProduct.name}${design} - ₹${Number(currentProduct.price||0).toLocaleString('en-IN')} | Tanisha Ethnic`,url:productUrl(currentProduct)};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(`${data.text}
${data.url}`);toast('Product link copied')}}catch(err){if(err&&err.name!=='AbortError')toast('Share nahi hua, dobara try karein')}};el('clearWishlist').onclick=()=>{if(confirm('Clear complete wishlist?'))setWishlist([])};el('zoomBtn').onclick=openZoom;el('modalImage').onclick=openZoom;el('closeZoom').onclick=closeZoom;el('galleryPrev').onclick=()=>updateGalleryImage(currentImageIndex-1);el('galleryNext').onclick=()=>updateGalleryImage(currentImageIndex+1);el('zoomPrev').onclick=()=>updateGalleryImage(currentImageIndex-1);el('zoomNext').onclick=()=>updateGalleryImage(currentImageIndex+1);const openMenu=()=>window.TanishaMenu&&window.TanishaMenu.open();const closeMenu=()=>window.TanishaMenu&&window.TanishaMenu.close();const closeAllOverlays=()=>{closeProduct();closeCart();closeMenu();closeZoom()};el('searchBtn').onclick=()=>{closeProduct();closeCart();closeMenu();el('search').scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>el('search').focus(),450)};el('cartBtn').onclick=()=>{closeProduct();closeMenu();openCart()};el('bottomCart').onclick=()=>{closeProduct();closeMenu();openCart()};document.querySelectorAll('.bottomNav a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const href=a.getAttribute('href');closeAllOverlays();setTimeout(()=>{const target=document.querySelector(href);if(target)target.scrollIntoView({behavior:'smooth',block:'start'});history.replaceState(null,'',href)},60)}));el('bottomSearch').onclick=()=>{closeAllOverlays();setTimeout(()=>el('searchBtn').click(),80)};el('modalHome').onclick=e=>{e.preventDefault();closeAllOverlays();setTimeout(()=>{el('top').scrollIntoView({behavior:'smooth',block:'start'});history.replaceState(null,'','#top')},60)};document.querySelectorAll('a[href^="#"]:not(.bottomNav a):not(#modalHome)').forEach(a=>a.addEventListener('click',()=>{closeProduct();closeCart();closeMenu()}));el('closeCart').onclick=closeCart;el('cartBackdrop').onclick=closeCart;el('clearCart').onclick=()=>{if(confirm('Clear complete cart?'))setCart([])};el('checkoutWa').onclick=cartWhatsApp;document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeProduct();closeCart();closeMenu();closeZoom()}});
let galleryTouchX=0;['modalImage','zoomImage'].forEach(id=>{const node=el(id);node.addEventListener('touchstart',e=>{galleryTouchX=e.changedTouches[0].clientX},{passive:true});node.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-galleryTouchX;if(Math.abs(dx)>45)updateGalleryImage(currentImageIndex+(dx<0?1:-1))},{passive:true})});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;el('installBtn').classList.remove('hidden')});el('installBtn').onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;el('installBtn').classList.add('hidden')};el('applyCoupon').onclick=()=>{const code=el('couponInput').value.trim().toUpperCase(),items=cart(),subtotal=items.reduce((sum,i)=>{const p=products.find(x=>String(x.id)===String(i.id));return sum+(p?Number(p.price||0)*Number(i.qty||1):0)},0);if(!code){localStorage.removeItem('te_coupon_v2');el('couponStatus').textContent='Coupon removed';renderCart();return}const result=activeCouponFor(code,subtotal);if(result.error){localStorage.removeItem('te_coupon_v2');el('couponStatus').textContent=result.error;toast(result.error);renderCart();return}localStorage.setItem('te_coupon_v2',code);el('couponStatus').textContent=result.shippingFree?'Free shipping applied':`${result.coupon.code} applied — ₹${result.discount.toLocaleString('en-IN')} saved`;toast('Coupon applied');renderCart()};el('trackingForm').onsubmit=e=>{e.preventDefault();const ref=new FormData(e.target).get('reference');window.open(`https://wa.me/${cleanPhone(storeSettings.whatsapp_number)}?text=${encodeURIComponent(`Hello ${storeSettings.store_name}, please check my order status. Reference/mobile: ${ref}`)}`,'_blank','noopener')};const showFestival=()=>{if(sessionStorage.getItem('te_festival_seen'))return;const live=heroItems()[0];el('festivalTitle').textContent=live.title;el('festivalText').textContent=live.text;setTimeout(()=>el('festivalPopup').classList.add('open'),1800)};el('closeFestival').onclick=()=>{el('festivalPopup').classList.remove('open');sessionStorage.setItem('te_festival_seen','1')};el('festivalShop').onclick=()=>el('festivalPopup').classList.remove('open');document.querySelectorAll('button,a').forEach(x=>x.classList.add('touchPulse'));showFestival();if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/service-worker.js').catch(()=>{}));loadStore();

// V39: pinch/double-tap zoom inside full-screen viewer
(()=>{const img=el('zoomImage');if(!img)return;let scale=1,startDist=0,lastTap=0;const apply=()=>{img.style.transform=`scale(${scale})`;img.classList.toggle('isZoomed',scale>1)};const reset=()=>{scale=1;apply()};img.addEventListener('touchstart',e=>{if(e.touches.length===2){startDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)}else if(e.touches.length===1){const now=Date.now();if(now-lastTap<320){scale=scale>1?1:2;apply()}lastTap=now}},{passive:true});img.addEventListener('touchmove',e=>{if(e.touches.length===2&&startDist){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);scale=Math.min(4,Math.max(1,scale*d/startDist));startDist=d;apply()}},{passive:true});img.addEventListener('touchend',e=>{if(e.touches.length<2)startDist=0},{passive:true});el('closeZoom').addEventListener('click',reset);document.addEventListener('keydown',e=>{if(e.key==='Escape')reset()})})();

window.addEventListener('load',()=>setTimeout(()=>document.getElementById('brandLoader')?.classList.add('hide'),650));
