// EzWorkers Social Share Widget
// Usage: insertShareBar(container, { title, url, description })

function insertShareBar(containerEl, opts) {
  if(!containerEl) return;
  var title = encodeURIComponent(opts.title || document.title);
  var url   = encodeURIComponent(opts.url   || window.location.href);
  var desc  = encodeURIComponent(opts.description || '');
  var rawUrl = opts.url || window.location.href;

  var links = [
    {
      name:  'WhatsApp',
      icon:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.779.467 3.449 1.28 4.9L2 22l5.233-1.263A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill-rule="evenodd" clip-rule="evenodd"/></svg>',
      color: '#25D366',
      href:  'https://wa.me/?text=' + title + '%20' + url,
    },
    {
      name:  'LinkedIn',
      icon:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
      color: '#0A66C2',
      href:  'https://www.linkedin.com/sharing/share-offsite/?url=' + url,
    },
    {
      name:  'X (Twitter)',
      icon:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
      color: '#000000',
      href:  'https://twitter.com/intent/tweet?text=' + title + '&url=' + url,
    },
    {
      name:  'Facebook',
      icon:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
      color: '#1877F2',
      href:  'https://www.facebook.com/sharer/sharer.php?u=' + url,
    },
    {
      name:  'Email',
      icon:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>',
      color: '#64748b',
      href:  'mailto:?subject=' + title + '&body=' + desc + '%0A%0A' + url,
    },
  ];

  var copyBtn = '<button class="ez-share-copy" onclick="ezCopyLink(\'' + rawUrl + '\', this)" title="Copy link">'+
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>'+
    'Copy link</button>';

  var style = '<style>.ez-share-bar{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;padding:.75rem 0;border-top:1px solid #f1f5f9;margin-top:1rem}'+
    '.ez-share-label{font-size:12px;font-weight:500;color:#94a3b8;letter-spacing:.04em;text-transform:uppercase;margin-right:.25rem}'+
    '.ez-share-btn{display:inline-flex;align-items:center;gap:.35rem;font-size:12px;font-weight:600;padding:.4rem .85rem;border-radius:20px;text-decoration:none;color:#fff;transition:opacity .15s;white-space:nowrap}'+
    '.ez-share-btn:hover{opacity:.85}'+
    '.ez-share-btn svg{width:14px;height:14px;flex-shrink:0}'+
    '.ez-share-copy{display:inline-flex;align-items:center;gap:.35rem;font-size:12px;font-weight:500;padding:.4rem .85rem;border-radius:20px;background:#f8fafc;border:1px solid #e2e8f0;color:#64748b;cursor:pointer;font-family:inherit;transition:all .15s}'+
    '.ez-share-copy:hover{border-color:#1A6FC4;color:#1A6FC4}'+
    '.ez-share-copy svg{width:14px;height:14px}'+
    '</style>';

  var btnHTML = links.map(function(l){
    return '<a class="ez-share-btn" href="'+l.href+'" target="_blank" rel="noopener noreferrer" title="Share on '+l.name+'" style="background:'+l.color+'">'+l.icon+l.name+'</a>';
  }).join('');

  containerEl.innerHTML = style +
    '<div class="ez-share-bar"><span class="ez-share-label">Share</span>' + btnHTML + copyBtn + '</div>';
}

function ezCopyLink(url, btn) {
  navigator.clipboard.writeText(url).then(function(){
    var orig = btn.innerHTML;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
    btn.style.borderColor = '#16a34a';
    btn.style.color = '#16a34a';
    setTimeout(function(){ btn.innerHTML = orig; btn.style.borderColor=''; btn.style.color=''; }, 2000);
  }).catch(function(){
    // Fallback for older browsers
    var ta = document.createElement('textarea');
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = 'Copied!';
    setTimeout(function(){ btn.textContent = 'Copy link'; }, 2000);
  });
}
