
export function createControlPanelModule(deps){
  const {supabase,content,$,$$,esc,toast}=deps;

  async function render(){
    const {data,error}=await supabase.rpc('admin_app_feature_flags_get',{});
    if(error) throw new Error('Falta ejecutar CATALUNA_PANEL_CONTROL_Y_DOCUMENTACION.sql en Supabase.');

    const rows=Array.isArray(data)?data:[];

    content.innerHTML=
      '<div class="hero"><div><h2>Panel de control</h2><p>Habilitá o deshabilitá módulos completos del rol Adulto Responsable.</p></div><div class="hero-badge">APP CATALUÑA</div></div>'+
      '<div class="card"><div class="card-head"><div><h3>Módulos del Adulto Responsable</h3><div class="card-sub">Cuando un módulo está deshabilitado, su botón deja de mostrarse en la app.</div></div></div>'+
      '<div class="control-module-list">'+
      rows.map(row=>
        '<div class="control-module-row">'+
          '<div><strong>'+esc(row.label||row.feature_key)+'</strong><div class="card-sub">'+esc(row.description||'')+'</div></div>'+
          '<button class="control-toggle '+(row.enabled?'on':'off')+'" data-key="'+esc(row.feature_key)+'" data-enabled="'+(row.enabled?'true':'false')+'">'+
            '<span class="control-toggle-dot"></span><span>'+(row.enabled?'HABILITADO':'DESHABILITADO')+'</span>'+
          '</button>'+
        '</div>'
      ).join('')+
      '</div></div>';

    $$('.control-toggle').forEach(button=>{
      button.onclick=async()=>{
        const key=button.dataset.key;
        const next=button.dataset.enabled!=='true';
        button.disabled=true;
        const {error}=await supabase.rpc('admin_app_feature_flag_set',{
          p_feature_key:key,
          p_enabled:next
        });
        if(error){
          toast(error.message||'No pudimos cambiar el estado del módulo.','error');
          button.disabled=false;
          return;
        }
        toast(next?'Módulo habilitado':'Módulo deshabilitado');
        await render();
      };
    });
  }

  return {render};
}
