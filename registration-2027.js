
export function createRegistration2027Module(deps){
  const {supabase,content,$,$$,esc,statusBadge,openPaymentProof,openModal,closeModal,toast}=deps;

  function methodLabel(value){
    const method=String(value||'');
    if(method==='cash') return 'EFECTIVO';
    if(method==='card_3_installments') return 'TARJETA · 3 CUOTAS';
    if(method==='transfer') return 'TRANSFERENCIA';
    if(method==='pending_admin') return 'A DEFINIR EN ADMINISTRACIÓN';
    return method||'-';
  }

  function status(value){
    const s=String(value||'');
    if(s==='paid') return statusBadge('PAGADO','green');
    if(s==='proof_review') return statusBadge('PAGO A REVISAR','amber');
    if(s==='pending_cash') return statusBadge('PENDIENTE EFECTIVO','gray');
    if(s==='pending_payment') return statusBadge('PAGO PENDIENTE','amber');
    if(s==='rejected') return statusBadge('RECHAZADO','red');
    return statusBadge(s||'SIN ESTADO','gray');
  }

  async function render(search='',statusFilter='all'){
    const [listResult,settingsResult]=await Promise.all([
      supabase.rpc('admin_registration_2027_list',{}),
      supabase.rpc('admin_registration_2027_get_settings',{})
    ]);
    if(listResult.error) throw new Error('Falta ejecutar la actualización SQL de INSCRIPCIÓN 2027 en Supabase.');
    if(settingsResult.error) throw settingsResult.error;

    const all=Array.isArray(listResult.data)?listResult.data:[];
    const settings=settingsResult.data||{};
    const q=String(search||'').trim().toLowerCase();
    const pendingStatuses=new Set(['pending_payment','pending_cash']);
    const rows=all.filter(row=>{
      if(statusFilter==='pending' && !pendingStatuses.has(row.payment_status)) return false;
      if(statusFilter!=='all' && statusFilter!=='pending' && row.payment_status!==statusFilter) return false;
      if(!q) return true;
      const text=[
        row.student_last_name,row.student_first_name,row.student_dni,row.shirt_size,
        methodLabel(row.payment_method),row.guardian_last_name,row.guardian_first_name,
        ...(Array.isArray(row.team_names)?row.team_names:[])
      ].filter(Boolean).join(' ').toLowerCase();
      return text.includes(q);
    });

    const review=all.filter(r=>r.payment_status==='proof_review').length;
    const pending=all.filter(r=>pendingStatuses.has(r.payment_status)).length;
    const paid=all.filter(r=>r.payment_status==='paid').length;

    content.innerHTML=
      '<div class="hero"><div><h2>Inscripción 2027</h2><p>Listado de inscriptos, talles y estado de pago.</p></div><div class="hero-badge">TEMPORADA 2027</div></div>'+


      '<div class="toolbar">'+
        '<input id="registrationSearch" class="grow" placeholder="Buscar por jugador, DNI, equipo o talle" value="'+esc(search)+'">'+
        '<select id="registrationStatusFilter" style="max-width:230px">'+
          '<option value="all" '+(statusFilter==='all'?'selected':'')+'>Todos los estados</option>'+
          '<option value="pending" '+(statusFilter==='pending'?'selected':'')+'>Pendientes de pago</option>'+
          '<option value="proof_review" '+(statusFilter==='proof_review'?'selected':'')+'>Pagos a revisar</option>'+
          '<option value="paid" '+(statusFilter==='paid'?'selected':'')+'>Pagados</option>'+
          '<option value="rejected" '+(statusFilter==='rejected'?'selected':'')+'>Rechazados</option>'+
        '</select>'+
        '<button id="registrationSettingsButton" class="btn light" type="button">⚙ CONFIGURACIÓN DE INSCRIPCIÓN</button>'+
      '</div>'+
      '<div class="table-wrap"><table class="data-table"><thead><tr>'+
        '<th>Jugador</th><th>DNI</th><th>Equipo/s</th><th>Talle</th><th>Medio de pago</th><th>Estado</th><th>Inscripción</th><th>Acciones</th>'+
      '</tr></thead><tbody>'+
      (rows.length?rows.map(row=>{
        const teams=Array.isArray(row.team_names)&&row.team_names.length?row.team_names.join(', '):'Sin equipo';
        const actions=[
          row.proof_storage_ref?'<button class="btn light small registration-proof" data-id="'+row.registration_id+'">Ver comprobante</button>':'',
          row.payment_status!=='paid'?'<button class="btn green small registration-pay" data-id="'+row.registration_id+'">CARGAR PAGO</button>':'',
          row.payment_status==='proof_review'?'<button class="btn danger small registration-reject" data-id="'+row.registration_id+'">Rechazar</button>':''
        ].join('');
        return '<tr>'+
          '<td class="name-cell">'+esc(row.student_last_name||'')+' '+esc(row.student_first_name||'')+'</td>'+
          '<td>'+esc(row.student_dni||'-')+'</td>'+
          '<td>'+esc(teams)+'</td>'+
          '<td><strong>'+esc(row.shirt_size||'-')+'</strong></td>'+
          '<td>'+esc(methodLabel(row.payment_method))+'</td>'+
          '<td>'+status(row.payment_status)+'</td>'+
          '<td>'+(row.registered_at?new Date(row.registered_at).toLocaleString('es-AR'):'-')+'</td>'+
          '<td><div class="actions">'+actions+'</div></td>'+
        '</tr>';
      }).join(''):'<tr><td colspan="8"><div class="empty">No hay inscripciones que coincidan con el filtro.</div></td></tr>')+
      '</tbody></table></div>'+
      '<div class="metrics">'+
        '<div class="metric brand"><div class="label">Total inscriptos</div><div class="value">'+all.length+'</div><div class="sub">Jugadores confirmados</div></div>'+
        '<div class="metric"><div class="label">Pendientes de pago</div><div class="value">'+pending+'</div><div class="sub">A cobrar por Administración</div></div>'+
        '<div class="metric red"><div class="label">Pagos a revisar</div><div class="value">'+review+'</div><div class="sub">Inscripciones anteriores con comprobante</div></div>'+
        '<div class="metric green"><div class="label">Pagados</div><div class="value">'+paid+'</div><div class="sub">Pago confirmado</div></div>'+
      '</div>'+
      '';

    $('#registrationSettingsButton').onclick=()=>settingsModal(settings,search,statusFilter);

    let timer;
    $('#registrationSearch').oninput=e=>{
      clearTimeout(timer);
      timer=setTimeout(()=>render(e.target.value.trim(),$('#registrationStatusFilter').value),250);
    };
    $('#registrationStatusFilter').onchange=e=>render($('#registrationSearch').value.trim(),e.target.value);

    $$('.registration-proof').forEach(btn=>btn.onclick=()=>{
      const row=all.find(r=>String(r.registration_id)===String(btn.dataset.id));
      if(row) openPaymentProof({
        storage_ref:row.proof_storage_ref,
        proof_path:row.proof_storage_ref,
        file_name:row.proof_file_name||'Comprobante inscripción 2027',
        mime_type:row.proof_mime_type||''
      });
    });
    $$('.registration-pay').forEach(btn=>btn.onclick=()=>{
      const row=all.find(r=>String(r.registration_id)===String(btn.dataset.id));
      if(row) paymentModal(row);
    });
    $$('.registration-reject').forEach(btn=>btn.onclick=()=>{
      const row=all.find(r=>String(r.registration_id)===String(btn.dataset.id));
      if(row) rejectModal(row);
    });
  }

  function settingsModal(settings,search='',statusFilter='all'){
    const sizes=Array.isArray(settings.shirt_sizes)?settings.shirt_sizes:[];
    openModal('Configuración de Inscripción 2027',
      '<form id="registrationSettingsForm" class="form-grid">'+
        '<label class="span-2">Talles disponibles'+
          '<textarea name="shirt_sizes" rows="3" placeholder="Ej. 6, 8, 10, 12, 14, S, M, L">'+esc(sizes.join(', '))+'</textarea>'+
          '<span class="section-note">Separalos por coma o por línea. En la app aparecerán como lista desplegable.</span>'+
        '</label>'+
        '<label>WhatsApp de Administración'+
          '<input name="whatsapp_number" placeholder="Ej. 54911..." value="'+esc(settings.whatsapp_number||'')+'">'+
        '</label>'+
        '<label>Importe por transferencia'+
          '<input name="transfer_amount" type="number" min="0" step="0.01" value="'+esc(settings.transfer_amount??0)+'">'+
        '</label>'+
        '<label>Importe en efectivo'+
          '<input name="cash_amount" type="number" min="0" step="0.01" value="'+esc(settings.cash_amount??0)+'">'+
        '</label>'+
        '<label>Importe con tarjeta de crédito'+
          '<input name="card_amount" type="number" min="0" step="0.01" value="'+esc(settings.card_amount??0)+'">'+
        '</label>'+
        '<label class="span-2">Horarios de Administración'+
          '<textarea name="admin_hours" rows="3" placeholder="Ej. Lunes a viernes de 17:00 a 20:00">'+esc(settings.admin_hours||'')+'</textarea>'+
        '</label>'+
        '<label class="span-2">Link de tabla de talles'+
          '<input name="size_chart_url" placeholder="https://..." value="'+esc(settings.size_chart_url||'')+'">'+
        '</label>'+
        '<label class="span-2">Link de imagen / miniatura de camiseta'+
          '<input name="shirt_preview_url" placeholder="https://..." value="'+esc(settings.shirt_preview_url||'')+'">'+
        '</label>'+
        '<p class="section-note span-2" style="margin:0">Los datos bancarios que verá la familia se toman de la configuración de pagos ya cargada en Conceptos.</p>'+
        '<div class="form-actions span-2"><button type="button" class="btn light" id="cancelRegistrationSettings">Cancelar</button><button class="btn primary" type="submit">GUARDAR CONFIGURACIÓN</button></div>'+
      '</form>'
    );

    $('#cancelRegistrationSettings').onclick=closeModal;
    $('#registrationSettingsForm').onsubmit=async e=>{
      e.preventDefault();
      const fd=new FormData(e.currentTarget);
      const rawSizes=String(fd.get('shirt_sizes')||'');
      const parsedSizes=[...new Set(rawSizes.split(/[\\n,;]+/).map(v=>v.trim()).filter(Boolean))];
      const {error}=await supabase.rpc('admin_registration_2027_save_settings',{
        p_transfer_amount:Number(fd.get('transfer_amount')||0),
        p_cash_amount:Number(fd.get('cash_amount')||0),
        p_card_amount:Number(fd.get('card_amount')||0),
        p_size_chart_url:String(fd.get('size_chart_url')||'').trim(),
        p_shirt_preview_url:String(fd.get('shirt_preview_url')||'').trim(),
        p_shirt_sizes:parsedSizes,
        p_whatsapp_number:String(fd.get('whatsapp_number')||'').trim(),
        p_admin_hours:String(fd.get('admin_hours')||'').trim()
      });
      if(error){toast(error.message||'No pudimos guardar la configuración.','error');return;}
      closeModal();
      toast('Configuración de Inscripción 2027 guardada.');
      await render(search,statusFilter);
    };
  }

  function paymentModal(row){
    const name=[row.student_last_name,row.student_first_name].filter(Boolean).join(' ');
    const currentMethod=['cash','card_3_installments','transfer'].includes(String(row.payment_method||''))?row.payment_method:'cash';
    openModal('Cargar pago · Inscripción 2027',
      '<form id="registrationPaymentForm" class="form-grid">'+
      '<div class="span-2 card" style="box-shadow:none"><strong>'+esc(name)+'</strong><div class="card-sub">'+esc(row.shirt_size||'Sin talle')+'</div></div>'+
      '<label>Medio de pago<select name="method">'+
        '<option value="cash" '+(currentMethod==='cash'?'selected':'')+'>Efectivo</option>'+
        '<option value="card_3_installments" '+(currentMethod==='card_3_installments'?'selected':'')+'>Tarjeta · 3 cuotas sin interés</option>'+
        '<option value="transfer" '+(currentMethod==='transfer'?'selected':'')+'>Transferencia</option>'+
      '</select></label>'+
      '<label>Importe abonado<input name="amount" type="number" min="0" step="0.01" placeholder="Opcional" value="'+(row.payment_amount??'')+'"></label>'+
      '<label class="span-2">Observación<textarea name="note" rows="3" placeholder="Ej. Pago recibido en Administración">'+esc(row.admin_note||'')+'</textarea></label>'+
      '<div class="form-actions span-2"><button type="button" class="btn light" id="cancelRegistrationPayment">Cancelar</button><button class="btn green" type="submit">CONFIRMAR PAGO</button></div></form>'
    );
    $('#cancelRegistrationPayment').onclick=closeModal;
    $('#registrationPaymentForm').onsubmit=async e=>{
      e.preventDefault();
      const fd=new FormData(e.currentTarget);
      const raw=String(fd.get('amount')||'').trim();
      const {error}=await supabase.rpc('admin_registration_2027_register_payment',{
        p_registration_id:row.registration_id,
        p_amount:raw===''?null:Number(raw),
        p_note:String(fd.get('note')||'').trim()||null,
        p_payment_method:String(fd.get('method')||'cash')
      });
      if(error){toast(error.message||'No pudimos registrar el pago.','error');return;}
      closeModal();toast('Pago de Inscripción 2027 registrado.');await render();
    };
  }

  function rejectModal(row){
    const name=[row.student_last_name,row.student_first_name].filter(Boolean).join(' ');
    openModal('Rechazar comprobante',
      '<form id="registrationRejectForm" class="form-stack"><p>Jugador: <strong>'+esc(name)+'</strong></p>'+
      '<label>Motivo / observación<textarea name="note" rows="4" placeholder="Ej. El comprobante no corresponde al importe abonado"></textarea></label>'+
      '<div class="form-actions"><button type="button" class="btn light" id="cancelRegistrationReject">Cancelar</button><button class="btn danger" type="submit">RECHAZAR PAGO</button></div></form>'
    );
    $('#cancelRegistrationReject').onclick=closeModal;
    $('#registrationRejectForm').onsubmit=async e=>{
      e.preventDefault();
      const fd=new FormData(e.currentTarget);
      const {error}=await supabase.rpc('admin_registration_2027_reject_payment',{
        p_registration_id:row.registration_id,
        p_note:String(fd.get('note')||'').trim()||null
      });
      if(error){toast(error.message||'No pudimos rechazar el pago.','error');return;}
      closeModal();toast('Comprobante rechazado.');await render();
    };
  }

  return {render};
}
