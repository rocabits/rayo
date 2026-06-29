(function () {
  var STORAGE_KEY = "rayo_data";
  var POSITION_ORDER = ["Delegado", "Entrenador", "Portero", "Defensa", "Medio", "Delantero"];
  var POSITION_LABELS = {
    "Portero": "Porteros",
    "Defensa": "Defensas",
    "Medio": "Medios",
    "Delantero": "Delanteros",
    "Entrenador": "Entrenadores",
    "Delegado": "Delegados",
    "": "Sin posición"
  };
  var PLAYER_POSITIONS = ["Portero", "Defensa", "Medio", "Delantero"];
  var STAFF_POSITIONS = ["Delegado", "Entrenador"];
  var STATUS_CONFIG = {
    disponible: { icon: "✅", label: "Disponible", bg: "#e8f5e9", color: "#2e7d32" },
    no_disponible: { icon: "🚫", label: "No disponible", bg: "#f5f5f5", color: "#616161" },
    lesionado: { icon: "🤕", label: "Lesionado", bg: "#ffebee", color: "#c62828" },
    sancionado: { icon: "🟥", label: "Sancionado", bg: "#fff3e0", color: "#e65100" },
  };

  var MATCH_TYPE_ORDER = ["liga", "copa", "amistoso"];
  var MATCH_TYPE_LABELS = {
    liga: "Liga",
    copa: "Copa",
    amistoso: "Amistosos"
  };

  var state = { seasons: [], activeSeasonId: null };
  var players = [];
  var matches = [];
  var editingId = null;
  var editingMatchId = null;
  var callUpTargetMatchId = null;
  var tempCallUps = null;
  var lineupTargetMatchId = null;
  var tempLineup = null;
  var pickerTargetSlot = null;
  var resultTargetMatchId = null;
  var currentView = "seasons";
  var jornadaValue = null;
  var jornadaManuallySet = false;
  var supabaseClient = null;
  var currentUserEmail = null;
  var supabaseChannel = null;
  var retryTimer = null;
 
  var elements = {
    seasonsGrid: document.getElementById("seasonsGrid"),
    playersList: document.getElementById("playersList"),
    emptyState: document.getElementById("emptyState"),
    statusSummary: document.getElementById("statusSummary"),
    modal: document.getElementById("modal"),
    modalOverlay: document.getElementById("modalOverlay"),
    modalPanel: document.getElementById("modalPanel"),
    fabOpen: document.getElementById("fabOpen"),
    modalClose: document.getElementById("modalClose"),
    playerForm: document.getElementById("playerForm"),
    nameInput: document.getElementById("name"),
    positionSelect: document.getElementById("position"),
    numberInput: document.getElementById("number"),
    statusSelect: document.getElementById("status"),
    paidToggle: document.getElementById("paidToggle"),
    paidLabel: document.getElementById("paidLabel"),
    playerNotes: document.getElementById("playerNotes"),
    modalTitle: document.getElementById("modalTitle"),
    headerTitle: document.getElementById("headerTitle"),
    btnBack: document.getElementById("btnBack"),
    viewSeasons: document.getElementById("viewSeasons"),
    viewSeasonMenu: document.getElementById("viewSeasonMenu"),
    viewPlantilla: document.getElementById("viewPlantilla"),
    viewPartidos: document.getElementById("viewPartidos"),
    viewEstadisticas: document.getElementById("viewEstadisticas"),
    viewLogin: document.getElementById("viewLogin"),
    viewUsuarios: document.getElementById("viewUsuarios"),
    matchesContainer: document.getElementById("matchesContainer"),
    matchesEmptyState: document.getElementById("matchesEmptyState"),
    modalMatch: document.getElementById("modalMatch"),
    modalMatchOverlay: document.getElementById("modalMatchOverlay"),
    modalMatchPanel: document.getElementById("modalMatchPanel"),
    modalMatchClose: document.getElementById("modalMatchClose"),
    matchForm: document.getElementById("matchForm"),
    editMatchId: document.getElementById("editMatchId"),
    matchDate: document.getElementById("matchDate"),
    matchTime: document.getElementById("matchTime"),
    matchOpponent: document.getElementById("matchOpponent"),
    matchVenue: document.getElementById("matchVenue"),
    matchType: document.getElementById("matchType"),
    matchJornada: document.getElementById("matchJornada"),
    matchField: document.getElementById("matchField"),
    matchNotes: document.getElementById("matchNotes"),
    matchModalTitle: document.getElementById("matchModalTitle"),
    modalCallUp: document.getElementById("modalCallUp"),
    modalCallUpOverlay: document.getElementById("modalCallUpOverlay"),
    modalCallUpClose: document.getElementById("modalCallUpClose"),
    callUpTitle: document.getElementById("callUpTitle"),
    callUpCounter: document.getElementById("callUpCounter"),
    callUpList: document.getElementById("callUpList"),
    btnSaveCallUp: document.getElementById("btnSaveCallUp"),
    modalConfirm: document.getElementById("modalConfirm"),
    modalConfirmOverlay: document.getElementById("modalConfirmOverlay"),
    modalConfirmPanel: document.getElementById("modalConfirmPanel"),
    confirmText: document.getElementById("confirmText"),
    confirmIcon: document.getElementById("confirmIcon"),
    btnConfirmCancel: document.getElementById("btnConfirmCancel"),
    btnConfirmOk: document.getElementById("btnConfirmOk"),
    modalLineup: document.getElementById("modalLineup"),
    modalLineupOverlay: document.getElementById("modalLineupOverlay"),
    modalLineupClose: document.getElementById("modalLineupClose"),
    lineupTitle: document.getElementById("lineupTitle"),
    lineupDef: document.getElementById("lineupDef"),
    lineupMid: document.getElementById("lineupMid"),
    lineupFwd: document.getElementById("lineupFwd"),
    footballField: document.getElementById("footballField"),
    fieldRows: document.getElementById("fieldRows"),
    btnSaveLineup: document.getElementById("btnSaveLineup"),
    modalPlayerPicker: document.getElementById("modalPlayerPicker"),
    modalPlayerPickerOverlay: document.getElementById("modalPlayerPickerOverlay"),
    modalPickerClose: document.getElementById("modalPickerClose"),
    pickerList: document.getElementById("pickerList"),
    lineupControls: document.getElementById("lineupControls"),
    modalResult: document.getElementById("modalResult"),
    modalResultOverlay: document.getElementById("modalResultOverlay"),
    modalResultClose: document.getElementById("modalResultClose"),
    resultTitle: document.getElementById("resultTitle"),
    resultOurGoals: document.getElementById("resultOurGoals"),
    resultTheirGoals: document.getElementById("resultTheirGoals"),
    resultRivalLabel: document.getElementById("resultRivalLabel"),
    resultGoalsList: document.getElementById("resultGoalsList"),
    resultCardsList: document.getElementById("resultCardsList"),
    resultSubsList: document.getElementById("resultSubsList"),
    btnSaveResult: document.getElementById("btnSaveResult"),
    btnResetScore: document.getElementById("btnResetScore"),
    resultNotes: document.getElementById("resultNotes"),
    statsTableBody: document.getElementById("statsTableBody"),
    statsTypeTabs: document.getElementById("statsTypeTabs"),
    teamStatsCard: document.getElementById("teamStatsCard"),
  };

  /* ────── STORAGE ────── */

  function loadFromStorage() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { state = JSON.parse(raw); } catch (e) { state = null; }
    }
    if (state && state.seasons && state.seasons.length) {
      var currentYear = new Date().getFullYear() % 100;
      state.seasons = state.seasons.filter(function (s) {
        if (s.name === "26/27") return false;
        var m = s.name.match(/^(\d+)\//);
        return m && parseInt(m[1], 10) <= currentYear;
      });
      if (!state.seasons.length) state = null;
    }

    if (!state || !state.seasons || !state.seasons.length) {
      var oldRaw = localStorage.getItem("rayo_players");
      if (oldRaw) {
        try {
          var oldPlayers = JSON.parse(oldRaw);
          if (Array.isArray(oldPlayers)) {
            var seasonId = generateId();
            migratePlayer(oldPlayers);
            state = {
              seasons: [{ id: seasonId, name: "25/26", players: oldPlayers, matches: [], stats: {} }],
              activeSeasonId: seasonId
            };
            localStorage.removeItem("rayo_players");
          }
        } catch (e) {}
      }
      if (!state || !state.seasons || !state.seasons.length) {
        state = {
          seasons: [],
          activeSeasonId: null
        };
      }
      saveToStorage();
    }
    syncPlayers();
    syncMatches();
  }

  function migratePlayer(arr) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].position === "Centrocampista") arr[i].position = "Medio";
      if (!arr[i].status || !STATUS_CONFIG[arr[i].status]) arr[i].status = "disponible";
      if (arr[i].paid === undefined) arr[i].paid = false;
      if (arr[i].notes === undefined) arr[i].notes = "";
    }
  }

  function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    supabaseSave();
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ────── TOAST ────── */

  function showToast(message, type) {
    var existing = document.querySelector(".toast");
    if (existing) existing.remove();

    var toast = document.createElement("div");
    toast.className = "toast toast-" + (type || "info");

    var icon = "";
    if (type === "success") icon = "\u2705";
    else if (type === "error") icon = "\u26A0\uFE0F";

    toast.innerHTML = "<span class=\"toast-icon\">" + icon + "</span><span class=\"toast-text\">" + message + "</span>";
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add("toast-visible");
    });

    setTimeout(function () {
      toast.classList.remove("toast-visible");
      setTimeout(function () { toast.remove(); }, 300);
    }, 3000);
  }

  /* ────── SEASON ────── */

  function getActiveSeason() {
    return state.seasons.find(function (s) { return s.id === state.activeSeasonId; });
  }

  function syncPlayers() {
    var season = getActiveSeason();
    players = season ? season.players : [];
  }

  function syncMatches() {
    var season = getActiveSeason();
    matches = season ? season.matches : [];
  }

  function setActiveSeason(id) {
    state.activeSeasonId = id;
    saveToStorage();
    syncPlayers();
    syncMatches();
  }

  function generateNextSeasonName() {
    var year = new Date().getFullYear();
    var first = year % 100;
    var second = (year + 1) % 100;
    return first + "/" + second;
  }

  function createNewSeason() {
    var name = generateNextSeasonName();
    var exists = false;
    for (var i = 0; i < state.seasons.length; i++) {
      if (state.seasons[i].name === name) { exists = true; break; }
    }
    if (exists) {
      showToast("\u26A0\uFE0F La temporada " + name + " ya existe.", "error");
      return;
    }
    var src = getActiveSeason();
    var copied = src ? src.players.map(function (p) { return { id: generateId(), name: p.name, position: p.position, number: p.number, status: p.status, paid: !!p.paid, notes: p.notes || "" }; }) : [];
    var seasonId = generateId();
    state.seasons.push({ id: seasonId, name: name, players: copied, matches: [], stats: {} });
    setActiveSeason(seasonId);
    saveToStorage();
    renderSeasons();
    showToast("\u2705 Temporada " + name + " creada correctamente.", "success");
  }

  function deleteSeason(id) {
    for (var i = 0; i < state.seasons.length; i++) {
      if (state.seasons[i].id === id) {
        state.seasons.splice(i, 1);
        break;
      }
    }
    if (state.activeSeasonId === id) {
      state.activeSeasonId = state.seasons.length > 0 ? state.seasons[0].id : null;
    }
    saveToStorage();
    renderSeasons();
    showToast("Temporada eliminada.", "success");
  }

  /* ────── VIEWS ────── */

  function hideAllViews() {
    elements.viewSeasons.classList.remove("active");
    elements.viewSeasonMenu.classList.remove("active");
    elements.viewPlantilla.classList.remove("active");
    elements.viewPartidos.classList.remove("active");
    elements.viewEstadisticas.classList.remove("active");
    elements.viewLogin.classList.remove("active");
    elements.viewUsuarios.classList.remove("active");
  }

  /* ────── AUTH ────── */

  function initSupabase() {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
      supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
  }

  function handleGoogleLogin() {
    if (!supabaseClient) return;
    supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    });
  }

  function checkSession() {
    if (!supabaseClient) return Promise.resolve(null);
    return supabaseClient.auth.getSession().then(function (result) {
      var session = result.data ? result.data.session : null;
      if (!session) return null;
      return supabaseClient.from('allowed_emails').select('email').in('app_id', ['rayo', 'all']).eq('email', session.user.email).maybeSingle().then(function (res) {
        if (res.data) {
          currentUserEmail = session.user.email;
          return session.user.email;
        }
        supabaseClient.auth.signOut();
        showToast('No tienes permiso para acceder', 'error');
        return null;
      }).catch(function () {
        currentUserEmail = session.user.email;
        return session.user.email;
      });
    }).catch(function () {
      return null;
    });
  }

  function showLogin() {
    currentView = "login";
    hideAllViews();
    elements.viewLogin.classList.add("active");
    document.querySelector('header').style.display = 'none';
    elements.fabOpen.style.display = "none";
    document.body.classList.remove("fab-visible");
  }

  function hideLogin() {
    document.querySelector('header').style.display = '';
  }

  /* ────── USUARIOS ────── */

  function showUsuarios() {
    currentView = "usuarios";
    hideAllViews();
    elements.viewUsuarios.classList.add("active");
    elements.fabOpen.style.display = "flex";
    document.body.classList.add("fab-visible");
    renderUsuarios();
  }

  function renderUsuarios() {
    if (!supabaseClient) return;
    supabaseClient.from('allowed_emails').select('email').eq('app_id', 'rayo').then(function (res) {
      var count = 0;
      var html = "";
      if (res.data) {
        var filtered = res.data.filter(function (r) { return r.email !== currentUserEmail; });
        count = filtered.length;
        for (var i = 0; i < filtered.length; i++) {
          html += '<div class="player-card" style="cursor:default">' +
            '<div class="player-info"><div class="player-name" style="font-size:14px;text-transform:none">' + escapeHtml(filtered[i].email) + '</div></div>' +
            '<button class="btn-edit" data-email="' + escapeHtml(filtered[i].email) + '" aria-label="Editar usuario">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
            '</button>' +
            '<button class="btn-delete" data-email="' + escapeHtml(filtered[i].email) + '" aria-label="Eliminar usuario">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>' +
            '</button></div>';
        }
      }
      document.getElementById("usuariosList").innerHTML = html || '<div class="empty-state" style="padding:40px 24px"><p class="empty-title">No hay usuarios</p><p class="empty-sub">Añade el primer email</p></div>';
      updateHeader(true, "RAYO: Usuarios (" + count + ")", "");
    });
  }

  function openUsuarioModal(email) {
    document.getElementById("inviteEmail").value = email || "";
    document.getElementById("editUsuarioEmail").value = email || "";
    document.getElementById("usuarioModalTitle").textContent = email ? "Editar usuario" : "Nuevo usuario";
    document.getElementById("modalUsuario").classList.add("open");
    setTimeout(function () { document.getElementById("inviteEmail").focus(); }, 350);
  }

  function closeUsuarioModal() {
    document.getElementById("modalUsuario").classList.remove("open");
    document.getElementById("editUsuarioEmail").value = "";
  }

  function saveUsuario() {
    var input = document.getElementById("inviteEmail");
    var email = input.value.trim();
    if (!email || email.indexOf('@') === -1) {
      showToast('Email no válido', 'error');
      return;
    }
    if (!supabaseClient) return;
    var oldEmail = document.getElementById("editUsuarioEmail").value;
    var doInsert = function () {
      supabaseClient.from('allowed_emails').insert({ app_id: 'rayo', email: email }).then(function (res) {
        if (res.error) {
          showToast('Error al guardar: ' + res.error.message, 'error');
        } else {
          closeUsuarioModal();
          renderUsuarios();
          showToast(oldEmail ? 'Usuario actualizado' : 'Usuario añadido', 'success');
        }
      });
    };
    if (oldEmail && oldEmail !== email) {
      supabaseClient.from('allowed_emails').delete().eq('app_id', 'rayo').eq('email', oldEmail).then(function (res) {
        if (res.error) {
          showToast('Error al actualizar', 'error');
        } else {
          doInsert();
        }
      });
    } else {
      doInsert();
    }
  }

  function removeUsuario(email) {
    if (!supabaseClient) return;
    showConfirm('¿Eliminar a ' + email + '?', function () {
      supabaseClient.from('allowed_emails').delete().eq('app_id', 'rayo').eq('email', email).then(function (res) {
        if (res.error) {
          showToast('Error al eliminar', 'error');
        } else {
          renderUsuarios();
          showToast('Usuario eliminado', 'success');
        }
      });
    });
  }

  /* ────── SUPABASE SYNC ────── */

  function supabaseSave() {
    if (!supabaseClient || !currentUserEmail) return;
    var pending = localStorage.getItem('rayo_pending');
    if (pending) {
      clearTimeout(retryTimer);
    }
    supabaseClient.from('app_data').upsert({
      app_id: 'rayo',
      data: state,
      updated_at: new Date().toISOString()
    }).then(function (res) {
      if (res.error) {
        localStorage.setItem('rayo_pending', '1');
        retryTimer = setTimeout(supabaseSave, 60000);
      } else {
        localStorage.removeItem('rayo_pending');
      }
    });
  }

  function supabaseLoad() {
    if (!supabaseClient || !currentUserEmail) return Promise.resolve(false);
    var pending = localStorage.getItem('rayo_pending');
    if (pending) {
      return supabaseClient.from('app_data').upsert({
        app_id: 'rayo',
        data: state,
        updated_at: new Date().toISOString()
      }).then(function () {
        localStorage.removeItem('rayo_pending');
        return true;
      }).catch(function () {
        return false;
      });
    }
    return supabaseClient.from('app_data').select('data').eq('app_id', 'rayo').maybeSingle().then(function (res) {
      if (res.data && res.data.data) {
        state = res.data.data;
        syncPlayers();
        syncMatches();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return true;
      }
      return false;
    }).catch(function () {
      return false;
    });
  }

  function supabaseOnChange(payload) {
    if (!payload.new || !payload.new.data) return;
    state = payload.new.data;
    syncPlayers();
    syncMatches();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (currentView === "plantilla") renderPlayers();
    else if (currentView === "partidos") renderMatches();
    else if (currentView === "estadisticas") renderEstadisticas();
    else if (currentView === "seasons") renderSeasons();
  }

  function supabaseSubscribe() {
    if (!supabaseClient || !currentUserEmail) return;
    supabaseChannel = supabaseClient.channel('app_data_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'app_data', filter: 'app_id=eq.rayo' },
        supabaseOnChange
      )
      .subscribe();
  }

  function supabaseUnsubscribe() {
    if (supabaseChannel) {
      supabaseClient.removeChannel(supabaseChannel);
      supabaseChannel = null;
    }
  }

  function updateHeader(back, title, count) {
    if (back) elements.btnBack.classList.add("visible");
    else elements.btnBack.classList.remove("visible");
    elements.headerTitle.textContent = title || "";
  }

  function showSeasons() {
    hideLogin();
    currentView = "seasons";
    hideAllViews();
    elements.viewSeasons.classList.add("active");
    updateHeader(false, "RAYO: Temporadas (" + state.seasons.length + ")", "");
    elements.fabOpen.style.display = "flex";
    document.body.classList.add("fab-visible");
    renderSeasons();
  }

  function showSeasonMenu() {
    currentView = "seasonMenu";
    hideAllViews();
    elements.viewSeasonMenu.classList.add("active");
    var season = getActiveSeason();
    updateHeader(true, "RAYO: " + (season ? season.name : ""), "");
    elements.fabOpen.style.display = "none";
    document.body.classList.remove("fab-visible");
  }

  function showPlantilla() {
    currentView = "plantilla";
    hideAllViews();
    elements.viewPlantilla.classList.add("active");
    updateHeader(true, "", "");
    elements.fabOpen.style.display = "flex";
    document.body.classList.add("fab-visible");
    renderPlayers();
  }

  function showPartidos() {
    currentView = "partidos";
    hideAllViews();
    elements.viewPartidos.classList.add("active");
    updateHeader(true, "", "");
    elements.fabOpen.style.display = "flex";
    document.body.classList.add("fab-visible");
    renderMatches();
  }

  function showEstadisticas() {
    currentView = "estadisticas";
    hideAllViews();
    elements.viewEstadisticas.classList.add("active");
    var season = getActiveSeason();
    updateHeader(true, "RAYO: " + season.name + ": Estadísticas", "");
    elements.fabOpen.style.display = "none";
    document.body.classList.remove("fab-visible");
    renderEstadisticas();
  }

  function switchView(view) {
    if (view === "plantilla") showPlantilla();
    else if (view === "partidos") showPartidos();
    else if (view === "estadisticas") showEstadisticas();
  }

  function handleBack() {
    if (currentView === "seasonMenu") {
      showSeasons();
    } else if (currentView === "plantilla" || currentView === "partidos" || currentView === "estadisticas") {
      showSeasonMenu();
    } else if (currentView === "usuarios") {
      showSeasons();
    }
  }

  /* ────── SEASONS RENDER ────── */

  function renderSeasons() {
    elements.seasonsGrid.innerHTML = "";
    var sorted = state.seasons.slice().sort(function (a, b) { return b.name.localeCompare(a.name); });
    var frag = document.createDocumentFragment();

    for (var i = 0; i < sorted.length; i++) {
      var s = sorted[i];
      var card = document.createElement("button");
      card.className = "season-card";
      card.dataset.seasonId = s.id;
      if (s.id === state.activeSeasonId) card.dataset.active = "true";

      var nameDiv = document.createElement("div");
      nameDiv.className = "season-card-name";
      nameDiv.textContent = s.name;

      var infoDiv = document.createElement("div");
      infoDiv.className = "season-card-info";
      var pCount = s.players ? s.players.filter(function (p) { return STAFF_POSITIONS.indexOf(p.position) === -1; }).length : 0;
      infoDiv.textContent = "\uD83D\uDC65 " + pCount + " jugadores  \uD83C\uDFDF\uFE0F " + ((s.matches && s.matches.length) || 0) + " partidos";

      var leftDiv = document.createElement("div");
      leftDiv.style.cssText = "flex:1;min-width:0;display:flex;flex-direction:column;gap:10px";
      leftDiv.appendChild(nameDiv);
      leftDiv.appendChild(infoDiv);
      card.appendChild(leftDiv);

      var delBtn = document.createElement("button");
      delBtn.className = "btn-delete";
      delBtn.setAttribute("aria-label", "Eliminar temporada");
      delBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>';
      card.appendChild(delBtn);

      frag.appendChild(card);
    }

    elements.seasonsGrid.appendChild(frag);
  }

  /* ────── PLAYER CRUD ────── */

  function groupPlayersByPosition() {
    var groups = {};
    for (var i = 0; i < POSITION_ORDER.length; i++) groups[POSITION_ORDER[i]] = [];
    groups[""] = [];
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      var key = p.position && POSITION_ORDER.indexOf(p.position) !== -1 ? p.position : "";
      groups[key].push(p);
    }
    for (var key in groups) {
      if (groups.hasOwnProperty(key)) {
        groups[key].sort(function (a, b) { return a.name.localeCompare(b.name); });
      }
    }
    var ordered = [];
    for (var i = 0; i < POSITION_ORDER.length; i++) {
      if (groups[POSITION_ORDER[i]].length > 0) ordered.push({ position: POSITION_ORDER[i], players: groups[POSITION_ORDER[i]] });
    }
    if (groups[""].length > 0) ordered.push({ position: "", players: groups[""] });
    return ordered;
  }

  function createPlayerCard(player) {
    var card = document.createElement("div");
    card.className = "player-card";
    card.dataset.id = player.id;

    var numberDiv = document.createElement("div");
    numberDiv.className = "player-number" + (player.number ? "" : " empty");
    numberDiv.textContent = player.number || "--";

    var infoDiv = document.createElement("div");
    infoDiv.className = "player-info";

    var nameDiv = document.createElement("div");
    nameDiv.className = "player-name";
    nameDiv.textContent = player.name;

    var posDiv = document.createElement("div");
    posDiv.className = "player-position" + (player.position ? "" : " empty");
    posDiv.textContent = player.position || "Sin posición";

    infoDiv.appendChild(nameDiv);
    infoDiv.appendChild(posDiv);

    var sc = STATUS_CONFIG[player.status] || STATUS_CONFIG.disponible;
    var badge = document.createElement("span");
    badge.className = "player-status-badge";
    badge.style.background = sc.bg;
    badge.style.color = sc.color;
    badge.textContent = sc.icon + " " + sc.label;
    infoDiv.appendChild(badge);

    var paidBadge = document.createElement("span");
    paidBadge.className = "player-paid-badge";
    if (player.paid) {
      paidBadge.style.background = "#e8f5e9";
      paidBadge.style.color = "#2e7d32";
      paidBadge.textContent = "✓ Pagado";
    } else {
      paidBadge.style.background = "#ffebee";
      paidBadge.style.color = "#c62828";
      paidBadge.textContent = "✗ No pagado";
    }
    infoDiv.appendChild(paidBadge);

    var editBtn = document.createElement("button");
    editBtn.className = "btn-edit";
    editBtn.setAttribute("aria-label", "Editar " + player.name);
    editBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';

    var deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-delete";
    deleteBtn.setAttribute("aria-label", "Eliminar " + player.name);
    deleteBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>';

    card.appendChild(numberDiv);
    card.appendChild(infoDiv);
    card.appendChild(editBtn);
    card.appendChild(deleteBtn);
    return card;
  }

  function countByStatus() {
    var counts = { disponible: 0, no_disponible: 0, lesionado: 0, sancionado: 0 };
    for (var i = 0; i < players.length; i++) {
      if (STAFF_POSITIONS.indexOf(players[i].position) !== -1) continue;
      var s = players[i].status;
      if (counts.hasOwnProperty(s)) counts[s]++;
    }
    return counts;
  }

  function renderStatusSummary() {
    if (getPlayerCount() === 0) { elements.statusSummary.innerHTML = ""; return; }
    var counts = countByStatus();
    var html = "";
    var sCount = getStaffCount();
    if (sCount > 0) {
      html += "<span class=\"status-summary-item\" style=\"background:#f3e5f5;color:#7b1fa2\">🧑‍🏫 " + sCount + "</span>";
    }
    var keys = ["disponible", "no_disponible", "lesionado", "sancionado"];
    for (var i = 0; i < keys.length; i++) {
      var cfg = STATUS_CONFIG[keys[i]];
      html += "<span class=\"status-summary-item\" style=\"background:" + cfg.bg + ";color:" + cfg.color + "\">" + cfg.icon + " " + counts[keys[i]] + "</span>";
    }
    elements.statusSummary.innerHTML = html;
  }

  function getPlayerCount() {
    var c = 0;
    for (var i = 0; i < players.length; i++) {
      if (PLAYER_POSITIONS.indexOf(players[i].position) !== -1) c++;
    }
    return c;
  }

  function getStaffCount() {
    var c = 0;
    for (var i = 0; i < players.length; i++) {
      if (STAFF_POSITIONS.indexOf(players[i].position) !== -1) c++;
    }
    return c;
  }

  function updatePlayerCount() {
    var season = getActiveSeason();
    var total = players.length;
    elements.headerTitle.textContent = "RAYO: " + (season ? season.name : "") + ": Plantilla (" + total + ")";
  }

  function renderPlayers() {
    elements.playersList.innerHTML = "";
    if (players.length === 0) {
      elements.emptyState.style.display = "flex";
      elements.statusSummary.innerHTML = "";
      updatePlayerCount();
      return;
    }
    elements.emptyState.style.display = "none";
    renderStatusSummary();
    updatePlayerCount();

    var groups = groupPlayersByPosition();
    var frag = document.createDocumentFragment();
    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      var section = document.createElement("div");
      section.className = "position-section";
      var header = document.createElement("div");
      header.className = "position-header";
      var nameSpan = document.createElement("span");
      nameSpan.className = "position-name";
      nameSpan.textContent = POSITION_LABELS[group.position] || "Jugadores";
      var countSpan = document.createElement("span");
      countSpan.className = "position-count";
      countSpan.textContent = group.players.length;
      header.appendChild(nameSpan);
      header.appendChild(countSpan);
      var cardsDiv = document.createElement("div");
      cardsDiv.className = "position-cards";
      for (var c = 0; c < group.players.length; c++) cardsDiv.appendChild(createPlayerCard(group.players[c]));
      section.appendChild(header);
      section.appendChild(cardsDiv);
      frag.appendChild(section);
    }
    elements.playersList.appendChild(frag);
  }

  function addPlayer(name, position, number, status, paid, notes) {
    var player = { id: generateId(), name: name.trim(), position: position || "", number: number || "", status: status || "disponible", paid: !!paid, notes: notes || "" };
    players.push(player);
    saveToStorage();
    renderPlayers();
  }

  function updatePlayer(id, name, position, number, status, paid, notes) {
    var player = players.find(function (p) { return p.id === id; });
    if (!player) return;
    player.name = name.trim();
    player.position = position || "";
    player.number = number || "";
    player.status = status || "disponible";
    player.paid = !!paid;
    player.notes = notes || "";
    saveToStorage();
    renderPlayers();
  }

  function deletePlayer(id) {
    var card = elements.playersList.querySelector('[data-id="' + CSS.escape(id) + '"]');
    var removeFn = function () {
      var idx = -1;
      for (var i = 0; i < players.length; i++) { if (players[i].id === id) { idx = i; break; } }
      if (idx !== -1) players.splice(idx, 1);
      saveToStorage();
      renderPlayers();
    };
    if (card) {
      card.classList.add("removing");
      card.addEventListener("animationend", removeFn, { once: true });
    } else {
      removeFn();
    }
  }

  /* ────── MATCH CRUD ────── */

  function formatMatchDate(dateStr, timeStr) {
    var parts = dateStr.split("-");
    var result = parts[2] + "/" + parts[1] + "/" + parts[0];
    if (timeStr) result += " " + timeStr;
    return result;
  }

  function getVenueLabel(venue) {
    return venue === "local" ? "Local" : "Visitante";
  }

  function getTypeLabel(type) {
    var labels = { amistoso: "Amistoso", liga: "Liga", copa: "Copa" };
    return labels[type] || type;
  }

  function renderMatches() {
    elements.matchesContainer.innerHTML = "";
    var season = getActiveSeason();
    elements.headerTitle.textContent = "RAYO: " + (season ? season.name : "") + ": Calendario (" + matches.length + ")";
    var sorted = matches.slice().sort(function (a, b) { return (a.jornada || 0) - (b.jornada || 0) || a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""); });

    if (sorted.length === 0) {
      elements.matchesEmptyState.style.display = "flex";
      return;
    }
    elements.matchesEmptyState.style.display = "none";

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var todayStr = today.toISOString().slice(0, 10);

    var nextIdx = -1;
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i].date >= todayStr) { nextIdx = i; break; }
    }

    var frag = document.createDocumentFragment();

    if (nextIdx !== -1) {
      var nm = sorted[nextIdx];
      var hero = document.createElement("div");
      hero.className = "match-hero";
      hero.dataset.id = nm.id;

      var hr = nm.result;
      if (hr) {
        if (hr.ourGoals > hr.theirGoals) hero.classList.add("match-win");
        else if (hr.ourGoals < hr.theirGoals) hero.classList.add("match-loss");
        else hero.classList.add("match-draw");
      }

      var heroTop = document.createElement("div");
      heroTop.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:8px";

      var heroLabel = document.createElement("div");
      heroLabel.className = "match-hero-label";
      heroLabel.textContent = getTypeLabel(nm.type).toUpperCase() + ": J" + (nm.jornada || "?");
      heroTop.appendChild(heroLabel);

      var heroActions = document.createElement("div");
      heroActions.className = "match-card-actions";

      var heroResultBtn = document.createElement("button");
      heroResultBtn.className = "btn-result";
      heroResultBtn.setAttribute("aria-label", "Resultado");
      heroResultBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 7 7 9 7"/><path d="M18 9h1.5a2.5 2.5 0 000-5C17 4 17 7 15 7"/><polyline points="9 12 12 10 15 12 12 14 9 12"/><path d="M9 18a2 2 0 012-2h2a2 2 0 012 2"/><path d="M9 18h6v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>';
      heroActions.appendChild(heroResultBtn);

      var heroLineup = document.createElement("button");
      heroLineup.className = "btn-lineup";
      heroLineup.setAttribute("aria-label", "Alineación");
      heroLineup.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="9" x2="22" y2="9"/><line x1="2" y1="15" x2="22" y2="15"/></svg>';
      heroActions.appendChild(heroLineup);

      var heroCallUp = document.createElement("button");
      heroCallUp.className = "btn-callup";
      heroCallUp.setAttribute("aria-label", "Convocatoria");
      heroCallUp.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>';
      heroActions.appendChild(heroCallUp);

      var heroEdit = document.createElement("button");
      heroEdit.className = "btn-edit";
      heroEdit.setAttribute("aria-label", "Editar partido");
      heroEdit.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
      heroActions.appendChild(heroEdit);

      var heroDelete = document.createElement("button");
      heroDelete.className = "btn-delete";
      heroDelete.setAttribute("aria-label", "Eliminar partido");
      heroDelete.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>';
      heroDelete.addEventListener("click", function (e) {
        e.stopPropagation();
        showConfirm("\u00BFEliminar partido contra \"" + nm.opponent + "\"?", function () { deleteMatch(nm.id); });
      });
      heroActions.appendChild(heroDelete);

      heroTop.appendChild(heroActions);
      hero.appendChild(heroTop);

      var heroBody = document.createElement("div");
      heroBody.style.cssText = "display:flex;align-items:center;gap:14px";

      var monthNames = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
      var hDateParts = nm.date.split("-");
      var heroDateBlock = document.createElement("div");
      heroDateBlock.className = "match-card-date";
      heroDateBlock.innerHTML = '<div class="match-card-day">' + parseInt(hDateParts[2], 10) + '</div><div class="match-card-month">' + monthNames[parseInt(hDateParts[1], 10) - 1] + '</div>';
      heroBody.appendChild(heroDateBlock);

      var heroInfo = document.createElement("div");
      heroInfo.style.cssText = "flex:1;min-width:0";

      var heroOpp = document.createElement("div");
      heroOpp.className = "match-hero-opponent";
      heroOpp.textContent = nm.opponent.toUpperCase();
      heroInfo.appendChild(heroOpp);

      if (hr) {
        var heroResult = document.createElement("div");
        heroResult.style.cssText = "font-size:18px;font-weight:800;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
        if (hr.ourGoals > hr.theirGoals) heroResult.style.color = "#2e7d32";
        else if (hr.ourGoals < hr.theirGoals) heroResult.style.color = "#c62828";
        else heroResult.style.color = "#f57f17";
        var heroOppUpper = nm.opponent.toUpperCase();
        var heroResultText = nm.venue === "local"
          ? "RAYO " + hr.ourGoals + " - " + hr.theirGoals + " " + heroOppUpper
          : heroOppUpper + " " + hr.theirGoals + " - " + hr.ourGoals + " RAYO";
        heroResult.textContent = heroResultText;
        heroInfo.appendChild(heroResult);
        heroOpp.style.display = "none";
      }

      var heroMeta = document.createElement("div");
      heroMeta.className = "match-hero-meta";
      heroMeta.style.marginBottom = "0";

      var venueBadge = document.createElement("span");
      venueBadge.className = "match-badge match-badge-venue";
      venueBadge.textContent = getVenueLabel(nm.venue);
      heroMeta.appendChild(venueBadge);

      var dtBadge = document.createElement("span");
      dtBadge.className = "match-badge match-badge-type";
      dtBadge.textContent = formatMatchDate(nm.date, nm.time);
      heroMeta.appendChild(dtBadge);

      if (nm.field) {
        var fieldBadge = document.createElement("span");
        fieldBadge.className = "match-badge match-badge-type";
        fieldBadge.textContent = nm.field;
        heroMeta.appendChild(fieldBadge);
      }

      var callUpsHero = nm.callUps || [];
      var cuHeroBadge = document.createElement("span");
      cuHeroBadge.className = "match-badge match-badge-venue";
      cuHeroBadge.textContent = getCallUpDisplay(callUpsHero, nm);
      heroMeta.appendChild(cuHeroBadge);

      var formationStr = nm.lineup ? getFormationStr(nm) : "";
      if (formationStr) {
        var formBadge = document.createElement("span");
        formBadge.className = "match-badge match-badge-type";
        formBadge.textContent = formationStr;
        heroMeta.appendChild(formBadge);
      }

      var heroCards = nm.cards || [];
      var heroYellow = 0, heroRed = 0;
      for (var hc = 0; hc < heroCards.length; hc++) {
        if (heroCards[hc].type === "yellow") heroYellow++;
        else heroRed++;
      }
      if (heroYellow > 0) {
        var yBadge = document.createElement("span");
        yBadge.className = "match-badge match-badge-type";
        yBadge.textContent = "🟨 " + heroYellow;
        heroMeta.appendChild(yBadge);
      }
      if (heroRed > 0) {
        var rBadge = document.createElement("span");
        rBadge.className = "match-badge match-badge-type";
        rBadge.textContent = "🟥 " + heroRed;
        heroMeta.appendChild(rBadge);
      }

      heroInfo.appendChild(heroMeta);
      heroBody.appendChild(heroInfo);
      hero.appendChild(heroBody);
      var heroSection = document.createElement("div");
      heroSection.className = "position-section";
      var heroHeader = document.createElement("div");
      heroHeader.className = "position-header";
      var heroName = document.createElement("span");
      heroName.className = "position-name";
      heroName.textContent = "PRÓXIMO PARTIDO";
      var heroCount = document.createElement("span");
      heroCount.className = "position-count";
      heroCount.textContent = "1";
      heroHeader.appendChild(heroName);
      heroHeader.appendChild(heroCount);
      heroSection.appendChild(heroHeader);
      heroSection.appendChild(hero);
      frag.appendChild(heroSection);
    }

    var groups = {};
    for (var t = 0; t < MATCH_TYPE_ORDER.length; t++) groups[MATCH_TYPE_ORDER[t]] = [];
    for (var i = 0; i < sorted.length; i++) {
      var key = sorted[i].type && MATCH_TYPE_ORDER.indexOf(sorted[i].type) !== -1 ? sorted[i].type : "amistoso";
      groups[key].push(sorted[i]);
    }

    var listWrap = document.createElement("div");
    listWrap.className = "players-list";

    for (var t = 0; t < MATCH_TYPE_ORDER.length; t++) {
      var type = MATCH_TYPE_ORDER[t];
      var typeMatches = groups[type];
      if (typeMatches.length === 0) continue;

      var section = document.createElement("div");
      section.className = "position-section";

      var header = document.createElement("div");
      header.className = "position-header";

      var nameSpan = document.createElement("span");
      nameSpan.className = "position-name";
      nameSpan.textContent = MATCH_TYPE_LABELS[type];

      var countSpan = document.createElement("span");
      countSpan.className = "position-count";
      countSpan.textContent = typeMatches.length;

      header.appendChild(nameSpan);
      header.appendChild(countSpan);
      section.appendChild(header);

      var cardsDiv = document.createElement("div");
      cardsDiv.className = "position-cards";

      for (var i = 0; i < typeMatches.length; i++) {
        var m = typeMatches[i];
        cardsDiv.appendChild(createMatchCardElement(m));
      }

      section.appendChild(cardsDiv);
      listWrap.appendChild(section);
    }

    frag.appendChild(listWrap);
    elements.matchesContainer.appendChild(frag);
  }

  function getNextJornada(type, excludeId) {
    var nums = [];
    for (var i = 0; i < matches.length; i++) {
      if (matches[i].id === excludeId) continue;
      if (matches[i].type === type && matches[i].jornada) {
        nums.push(matches[i].jornada);
      }
    }
    if (nums.length === 0) return 1;
    nums.sort(function (a, b) { return a - b; });
    for (var j = 1; j <= nums.length; j++) {
      if (nums[j - 1] !== j) return j;
    }
    return nums.length + 1;
  }

  function addMatch(date, time, opponent, venue, type, field, notes, jornada) {
    var match = {
      id: generateId(),
      date: date,
      time: time || "",
      opponent: opponent.trim(),
      venue: venue || "local",
      type: type || "amistoso",
      jornada: jornada || getNextJornada(type),
      field: field || "",
      notes: notes || "",
      callUps: [],
      lineup: null,
      result: null,
      goals: [],
      cards: [],
      substitutions: []
    };
    matches.push(match);
    saveToStorage();
    renderMatches();
  }

  function updateMatch(id, date, time, opponent, venue, type, field, notes, jornada) {
    var match = matches.find(function (m) { return m.id === id; });
    if (!match) return;
    match.date = date;
    match.time = time || "";
    match.opponent = opponent.trim();
    match.venue = venue || "local";
    match.type = type || "amistoso";
    match.field = field || "";
    match.notes = notes || "";
    match.jornada = jornada || getNextJornada(match.type);
    var callUps = match.callUps || [];
    if (callUps.length > getCallUpMax(match)) {
      match.callUps = [];
    }
    saveToStorage();
    renderMatches();
  }

  function deleteMatch(id) {
    var card = elements.matchesContainer.querySelector('.match-card[data-id="' + CSS.escape(id) + '"]');
    var removeFn = function () {
      var idx = -1;
      for (var i = 0; i < matches.length; i++) { if (matches[i].id === id) { idx = i; break; } }
      if (idx !== -1) matches.splice(idx, 1);
      saveToStorage();
      renderMatches();
    };
    if (card) {
      card.classList.add("removing");
      card.addEventListener("animationend", removeFn, { once: true });
    } else {
      removeFn();
    }
  }

  /* ────── MODAL ────── */

  function setPaidToggle(paid) {
    if (paid) {
      elements.paidToggle.classList.add("active");
      elements.paidToggle.setAttribute("aria-checked", "true");
      elements.paidLabel.textContent = "Sí";
    } else {
      elements.paidToggle.classList.remove("active");
      elements.paidToggle.setAttribute("aria-checked", "false");
      elements.paidLabel.textContent = "No";
    }
  }

  function openModal(player) {
    if (player) {
      editingId = player.id;
      elements.modalTitle.textContent = "Editar jugador";
      elements.nameInput.value = player.name;
      elements.positionSelect.value = player.position || "";
      elements.numberInput.value = player.number || "";
      elements.statusSelect.value = player.status || "disponible";
      setPaidToggle(player.paid);
      elements.playerNotes.value = player.notes || "";
    } else {
      editingId = null;
      elements.modalTitle.textContent = "Nuevo jugador";
      elements.playerForm.reset();
      setPaidToggle(false);
      elements.playerNotes.value = "";
    }
    elements.modal.classList.add("open");
    document.body.style.overflow = "hidden";
    setTimeout(function () { elements.nameInput.focus(); }, 350);
  }

  function closeModal() {
    editingId = null;
    elements.modal.classList.remove("open");
    document.body.style.overflow = "";
    elements.playerForm.reset();
    setPaidToggle(false);
  }

  function createMatchCardElement(m) {
    var monthNames = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];

    var card = document.createElement("div");
    card.className = "match-card";
    card.dataset.id = m.id;

    var r = m.result;
    if (r) {
      if (r.ourGoals > r.theirGoals) card.classList.add("match-win");
      else if (r.ourGoals < r.theirGoals) card.classList.add("match-loss");
      else card.classList.add("match-draw");
    }

    var cardTop = document.createElement("div");
    cardTop.className = "match-card-top";

    var jornadaLabel = document.createElement("div");
    jornadaLabel.className = "match-hero-label";
    jornadaLabel.textContent = getTypeLabel(m.type).toUpperCase() + ": J" + (m.jornada || "?");
    cardTop.appendChild(jornadaLabel);

    var cardActions = document.createElement("div");
    cardActions.className = "match-card-actions";

    var resultBtn = document.createElement("button");
    resultBtn.className = "btn-result";
    resultBtn.setAttribute("aria-label", "Resultado");
    resultBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 7 7 9 7"/><path d="M18 9h1.5a2.5 2.5 0 000-5C17 4 17 7 15 7"/><polyline points="9 12 12 10 15 12 12 14 9 12"/><path d="M9 18a2 2 0 012-2h2a2 2 0 012 2"/><path d="M9 18h6v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>';
    cardActions.appendChild(resultBtn);

    var lineupBtn = document.createElement("button");
    lineupBtn.className = "btn-lineup";
    lineupBtn.setAttribute("aria-label", "Alineación");
    lineupBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="9" x2="22" y2="9"/><line x1="2" y1="15" x2="22" y2="15"/></svg>';
    cardActions.appendChild(lineupBtn);

    var callUpBtn = document.createElement("button");
    callUpBtn.className = "btn-callup";
    callUpBtn.setAttribute("aria-label", "Convocatoria");
    callUpBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>';
    cardActions.appendChild(callUpBtn);

    var editBtn = document.createElement("button");
    editBtn.className = "btn-edit";
    editBtn.setAttribute("aria-label", "Editar partido");
    editBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    cardActions.appendChild(editBtn);

    var deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-delete";
    deleteBtn.setAttribute("aria-label", "Eliminar partido");
    deleteBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>';
    deleteBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var mName = " \"" + m.opponent + "\"";
      showConfirm("\u00BFEliminar partido contra" + mName + "?", function () { deleteMatch(m.id); });
    });
    cardActions.appendChild(deleteBtn);

    cardTop.appendChild(cardActions);
    card.appendChild(cardTop);

    var cardBody = document.createElement("div");
    cardBody.className = "match-card-body";

    var dateParts = m.date.split("-");
    var dateDiv = document.createElement("div");
    dateDiv.className = "match-card-date";
    dateDiv.innerHTML = '<div class="match-card-day">' + parseInt(dateParts[2], 10) + '</div><div class="match-card-month">' + monthNames[parseInt(dateParts[1], 10) - 1] + '</div>';
    cardBody.appendChild(dateDiv);

    var infoDiv = document.createElement("div");
    infoDiv.className = "match-card-info";

    var oppDiv = document.createElement("div");
    oppDiv.className = "match-hero-opponent";
    oppDiv.textContent = m.opponent.toUpperCase();
    infoDiv.appendChild(oppDiv);

    if (r) {
      var resultDiv = document.createElement("div");
      resultDiv.className = "match-card-result";
      var oppUpper = m.opponent.toUpperCase();
      var resultText = m.venue === "local"
        ? "RAYO " + r.ourGoals + " - " + r.theirGoals + " " + oppUpper
        : oppUpper + " " + r.theirGoals + " - " + r.ourGoals + " RAYO";
      resultDiv.textContent = resultText;
      infoDiv.appendChild(resultDiv);
      oppDiv.style.display = "none";
    }

    var metaDiv = document.createElement("div");
    metaDiv.className = "match-hero-meta";

    var venueB = document.createElement("span");
    venueB.className = "match-badge match-badge-venue";
    venueB.textContent = getVenueLabel(m.venue);
    metaDiv.appendChild(venueB);

    var dtB = document.createElement("span");
    dtB.className = "match-badge match-badge-type";
    dtB.textContent = formatMatchDate(m.date, m.time);
    metaDiv.appendChild(dtB);

    if (m.field) {
      var fieldB = document.createElement("span");
      fieldB.className = "match-badge match-badge-type";
      fieldB.textContent = m.field;
      metaDiv.appendChild(fieldB);
    }

    var callUps = m.callUps || [];
    var cuB = document.createElement("span");
    cuB.className = "match-badge match-badge-venue";
    cuB.textContent = getCallUpDisplay(callUps, m);
    metaDiv.appendChild(cuB);

    var formation = m.lineup ? getFormationStr(m) : "";
    if (formation) {
      var formB = document.createElement("span");
      formB.className = "match-badge match-badge-type";
      formB.textContent = formation;
      metaDiv.appendChild(formB);
    }

    var cards = m.cards || [];
    var yellowCount = 0, redCount = 0;
    for (var ci = 0; ci < cards.length; ci++) {
      if (cards[ci].type === "yellow") yellowCount++;
      else redCount++;
    }
    if (yellowCount > 0) {
      var yB = document.createElement("span");
      yB.className = "match-badge match-badge-type";
      yB.textContent = "🟨 " + yellowCount;
      metaDiv.appendChild(yB);
    }
    if (redCount > 0) {
      var rB = document.createElement("span");
      rB.className = "match-badge match-badge-type";
      rB.textContent = "🟥 " + redCount;
      metaDiv.appendChild(rB);
    }

    infoDiv.appendChild(metaDiv);
    cardBody.appendChild(infoDiv);
    card.appendChild(cardBody);

    return card;
  }

  /* ────── MATCH MODAL ────── */

  function openMatchModal(match) {
    jornadaManuallySet = false;
    if (match) {
      editingMatchId = match.id;
      elements.matchModalTitle.textContent = "Editar partido";
      elements.editMatchId.value = match.id;
      elements.matchDate.value = match.date;
      elements.matchTime.value = match.time || "";
      elements.matchOpponent.value = match.opponent;
      elements.matchVenue.value = match.venue || "local";
      elements.matchType.value = match.type || "amistoso";
      elements.matchField.value = match.field || "";
      elements.matchNotes.value = match.notes || "";
      elements.matchJornada.value = match.jornada || "";
      jornadaValue = match.jornada || null;
    } else {
      editingMatchId = null;
      elements.matchModalTitle.textContent = "Nuevo partido";
      elements.matchForm.reset();
      elements.editMatchId.value = "";
      var today = new Date().toISOString().slice(0, 10);
      elements.matchDate.value = today;
      elements.matchJornada.value = getNextJornada(elements.matchType.value, null);
      jornadaValue = null;
    }
    elements.modalMatch.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeMatchModal() {
    editingMatchId = null;
    elements.modalMatch.classList.remove("open");
    document.body.style.overflow = "";
    elements.matchForm.reset();
  }

  /* ────── CALL UP ────── */

  function getTotalNonStaff() {
    var c = 0;
    for (var i = 0; i < players.length; i++) {
      if (STAFF_POSITIONS.indexOf(players[i].position) === -1) c++;
    }
    return c;
  }

  function getCallUpMax(match) {
    return match && match.type === "amistoso" ? Infinity : 17;
  }

  function getCallUpDisplay(callUps, match) {
    var n = callUps.length;
    if (match && match.type === "amistoso") return n + "/" + getTotalNonStaff();
    return n + "/17";
  }

  function openCallUpModal(matchId) {
    callUpTargetMatchId = matchId;
    var match = matches.find(function (m) { return m.id === matchId; });
    if (!match) return;
    tempCallUps = (match.callUps || []).slice();
    elements.callUpTitle.textContent = "Editar convocatoria";
    renderCallUpList();
    elements.modalCallUp.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeCallUpModal() {
    callUpTargetMatchId = null;
    tempCallUps = null;
    elements.modalCallUp.classList.remove("open");
    document.body.style.overflow = "";
  }

  function getCallUpsForMatch(matchId) {
    var match = matches.find(function (m) { return m.id === matchId; });
    return match ? (match.callUps || []) : [];
  }

  function renderCallUpList() {
    var callUps = tempCallUps || [];
    var count = callUps.length;
    var availableCount = 0;
    for (var a = 0; a < players.length; a++) {
      if (players[a].status === "disponible" && STAFF_POSITIONS.indexOf(players[a].position) === -1) availableCount++;
    }
    var callUpMatch = matches.find(function (m) { return m.id === callUpTargetMatchId; });
    elements.callUpCounter.innerHTML = "Convocados: <strong>" + count + "</strong>" + (callUpMatch && callUpMatch.type === "amistoso" ? "" : "/" + getCallUpMax(callUpMatch)) + " &middot; Disponibles: " + availableCount;

    if (players.length === 0) {
      elements.callUpList.innerHTML = '<div class="empty-state"><p class="empty-sub">No hay jugadores en la plantilla</p></div>';
      return;
    }

    var groups = groupPlayersByPosition();
    var frag = document.createDocumentFragment();

    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      if (STAFF_POSITIONS.indexOf(group.position) !== -1) continue;
      var section = document.createElement("div");
      section.className = "position-section";

      var header = document.createElement("div");
      header.className = "position-header";
      var nameSpan = document.createElement("span");
      nameSpan.className = "position-name";
      nameSpan.textContent = POSITION_LABELS[group.position] || "Jugadores";
      header.appendChild(nameSpan);
      section.appendChild(header);

      for (var c = 0; c < group.players.length; c++) {
        var player = group.players[c];
        var isCalled = callUps.indexOf(player.id) !== -1;

        var item = document.createElement("div");
        item.className = "callup-item";
        item.dataset.playerId = player.id;

        var numDiv = document.createElement("div");
        numDiv.className = "callup-item-number";
        numDiv.textContent = player.number || "--";

        var infoDiv = document.createElement("div");
        infoDiv.className = "callup-item-info";

        var nameDiv = document.createElement("div");
        nameDiv.className = "callup-item-name";
        nameDiv.textContent = player.name;
        infoDiv.appendChild(nameDiv);

        var posDiv = document.createElement("div");
        posDiv.className = "callup-item-pos";
        posDiv.textContent = player.position || "Sin posición";
        infoDiv.appendChild(posDiv);

        var sc = STATUS_CONFIG[player.status] || STATUS_CONFIG.disponible;
        var badge = document.createElement("span");
        badge.className = "player-status-badge";
        badge.style.background = sc.bg;
        badge.style.color = sc.color;
        badge.textContent = sc.icon + " " + sc.label;
        infoDiv.appendChild(badge);

        var paidB = document.createElement("span");
        paidB.className = "player-paid-badge";
        if (player.paid) {
          paidB.style.background = "#e8f5e9";
          paidB.style.color = "#2e7d32";
          paidB.textContent = "✓ Pagado";
        } else {
          paidB.style.background = "#ffebee";
          paidB.style.color = "#c62828";
          paidB.textContent = "✗ No pagado";
        }
        infoDiv.appendChild(paidB);

        var toggle = document.createElement("button");
        toggle.className = "callup-toggle" + (isCalled ? " active" : "");
        toggle.setAttribute("aria-label", (isCalled ? "Desconvocar" : "Convocar") + " a " + player.name);
        if (player.status !== "disponible") toggle.classList.add("disabled");
        if (count >= getCallUpMax(callUpMatch) && !isCalled) toggle.classList.add("disabled");

        item.appendChild(numDiv);
        item.appendChild(infoDiv);
        item.appendChild(toggle);
        section.appendChild(item);
      }

      frag.appendChild(section);
    }

    elements.callUpList.innerHTML = "";
    elements.callUpList.appendChild(frag);
  }

  function toggleCallUp(playerId) {
    if (!tempCallUps) tempCallUps = [];
    var idx = tempCallUps.indexOf(playerId);
    if (idx !== -1) {
      tempCallUps.splice(idx, 1);
    } else {
      var cuMatch = matches.find(function (m) { return m.id === callUpTargetMatchId; });
      if (tempCallUps.length >= getCallUpMax(cuMatch)) return;
      tempCallUps.push(playerId);
    }
    renderCallUpList();
  }

  function saveCallUps() {
    var match = matches.find(function (m) { return m.id === callUpTargetMatchId; });
    if (!match) return;
    if (tempCallUps && tempCallUps.length > getCallUpMax(match)) {
      showToast("M\u00E1ximo " + getCallUpMax(match) + " convocados. Tienes " + tempCallUps.length + ".", "error");
      return;
    }
    match.callUps = tempCallUps || [];
    saveToStorage();
    closeCallUpModal();
    renderMatches();
  }

  /* ────── CONFIRM ────── */

  var confirmCallback = null;

  function showConfirm(message, onConfirm, buttonText) {
    confirmCallback = onConfirm;
    elements.confirmText.textContent = message;
    elements.btnConfirmOk.textContent = buttonText || "Eliminar";
    elements.btnConfirmOk.classList.toggle("confirm-create", buttonText === "Crear");
    if (buttonText === "Crear") {
      elements.confirmIcon.innerHTML = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    } else {
      elements.confirmIcon.innerHTML = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    }
    elements.modalConfirm.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeConfirm() {
    confirmCallback = null;
    elements.modalConfirm.classList.remove("open");
    document.body.style.overflow = "";
  }

  /* ────── HELPERS ────── */

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* ────── LINEUP ────── */

  function getLineup(matchId) {
    var match = matches.find(function (m) { return m.id === matchId; });
    if (!match) return null;
    if (!match.lineup) match.lineup = { def: 4, mid: 4, fwd: 2, slots: {} };
    return match.lineup;
  }

  function getSlotId(line, index) {
    if (line === "gk") return "gk";
    return line + "_" + index;
  }

  function getFormationStr(match) {
    var lu = match.lineup;
    if (!lu) return "";
    return lu.def + "-" + lu.mid + "-" + lu.fwd;
  }

  function openLineupModal(matchId) {
    lineupTargetMatchId = matchId;
    var match = matches.find(function (m) { return m.id === matchId; });
    if (!match) return;
    elements.lineupTitle.textContent = "Editar alineaci\u00F3n";

    var lu = getLineup(matchId);
    // deep copy into temp
    tempLineup = { def: lu.def, mid: lu.mid, fwd: lu.fwd, slots: {} };
    for (var k in lu.slots) {
      if (lu.slots.hasOwnProperty(k)) tempLineup.slots[k] = lu.slots[k];
    }

    elements.lineupDef.textContent = tempLineup.def;
    elements.lineupMid.textContent = tempLineup.mid;
    elements.lineupFwd.textContent = tempLineup.fwd;
    renderField();

    elements.modalLineup.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeLineupModal() {
    lineupTargetMatchId = null;
    tempLineup = null;
    elements.modalLineup.classList.remove("open");
    document.body.style.overflow = "";
  }

  function renderField() {
    var def = parseInt(elements.lineupDef.textContent, 10);
    var mid = parseInt(elements.lineupMid.textContent, 10);
    var fwd = parseInt(elements.lineupFwd.textContent, 10);
    if (!tempLineup) return;

    // ensure slots exist for current config
    if (!tempLineup.slots) tempLineup.slots = {};
    var lines = { gk: 1, def: def, mid: mid, fwd: fwd };
    var allSlots = {};
    for (var line in lines) {
      var count = lines[line];
      for (var i = 0; i < count; i++) {
        var sid = getSlotId(line, i);
        allSlots[sid] = true;
        if (tempLineup.slots[sid] === undefined) tempLineup.slots[sid] = null;
      }
    }
    // remove slots for lines that were reduced
    for (var key in tempLineup.slots) {
      if (!allSlots[key] && key !== "gk") {
        delete tempLineup.slots[key];
      }
    }

    var linesArr = [
      { id: "fwd", label: "DEL", count: fwd },
      { id: "mid", label: "MED", count: mid },
      { id: "def", label: "DEF", count: def },
      { id: "gk", label: "POR", count: 1 }
    ];

    var html = "";
    for (var li = 0; li < linesArr.length; li++) {
      var ln = linesArr[li];
      var rowClass = "field-row";
      if (ln.id === "def") rowClass += " field-row-def";
      if (ln.id === "mid") rowClass += " field-row-mid";
      html += '<div class="' + rowClass + '">';
      for (var i = 0; i < ln.count; i++) {
        var sid = getSlotId(ln.id, i);
        var assigned = tempLineup.slots[sid];
        var player = assigned ? players.find(function (p) { return p.id === assigned; }) : null;
        var filled = !!player;
        html += '<div class="field-slot' + (filled ? " filled" : "") + '" data-slot="' + sid + '">';
        html += '  <span class="field-slot-num">' + (player ? escapeHtml(player.name) : "—") + '</span>';
        html += '  <span class="field-slot-label">' + (player && player.number ? player.number : ln.label + (ln.count > 1 ? " " + (i + 1) : "")) + '</span>';
        html += '</div>';
      }
      html += '</div>';
    }
    elements.fieldRows.innerHTML = html;
  }

  function openPlayerPicker(slotId) {
    pickerTargetSlot = slotId;
    var match = matches.find(function (m) { return m.id === lineupTargetMatchId; });
    if (!match) return;
    var callUps = match.callUps || [];
    if (!tempLineup) return;

    // players already assigned to other slots
    var assigned = {};
    var slotPlayerIds = [];
    for (var key in tempLineup.slots) {
      if (tempLineup.slots.hasOwnProperty(key)) {
        if (tempLineup.slots[key]) {
          assigned[tempLineup.slots[key]] = true;
          slotPlayerIds.push(tempLineup.slots[key]);
        }
      }
    }

    // all players, not just called-up
    var available = [];
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      if (STAFF_POSITIONS.indexOf(p.position) !== -1) continue;
      if (assigned[p.id] && p.id !== tempLineup.slots[slotId]) continue;
      available.push(p);
    }

    // group by position
    var groups = {};
    for (var i = 0; i < POSITION_ORDER.length; i++) groups[POSITION_ORDER[i]] = [];
    groups[""] = [];
    for (var i = 0; i < available.length; i++) {
      var p = available[i];
      var key = p.position && POSITION_ORDER.indexOf(p.position) !== -1 ? p.position : "";
      groups[key].push(p);
    }
    for (var key in groups) {
      if (groups.hasOwnProperty(key)) {
        groups[key].sort(function (a, b) { return a.name.localeCompare(b.name); });
      }
    }

    function isInLineup(pid, slots) {
      for (var k in slots) { if (slots.hasOwnProperty(k) && slots[k] === pid) return true; }
      return false;
    }

    var html = "";
    for (var i = 0; i < POSITION_ORDER.length; i++) {
      var pos = POSITION_ORDER[i];
      if (groups[pos].length === 0) continue;
      html += '<div class="picker-group-header">' + pos + '</div>';
      for (var j = 0; j < groups[pos].length; j++) {
        var p = groups[pos][j];
        var badges = [];
        if (isInLineup(p.id, tempLineup.slots)) badges.push("Alineado (I)");
        else if (callUps.indexOf(p.id) !== -1) badges.push("Convocado (C)");
        else badges.push("No convocado (-)");
        html += '<div class="picker-item" data-player-id="' + p.id + '">';
        html += '  <div class="picker-item-num">' + (p.number || "—") + '</div>';
        html += '  <div class="picker-item-name">' + escapeHtml(p.name);
        if (badges.length) html += ' <span class="picker-badge">' + badges.join(" ") + '</span>';
        html += '</div>';
        html += '</div>';
      }
    }
    if (groups[""].length > 0) {
      html += '<div class="picker-group-header">Otra</div>';
      for (var j = 0; j < groups[""].length; j++) {
        var p = groups[""][j];
        var badges = [];
        if (isInLineup(p.id, tempLineup.slots)) badges.push("Alineado (I)");
        else if (callUps.indexOf(p.id) !== -1) badges.push("Convocado (C)");
        else badges.push("No convocado (-)");
        html += '<div class="picker-item" data-player-id="' + p.id + '">';
        html += '  <div class="picker-item-num">' + (p.number || "—") + '</div>';
        html += '  <div class="picker-item-name">' + escapeHtml(p.name);
        if (badges.length) html += ' <span class="picker-badge">' + badges.join(" ") + '</span>';
        html += '</div>';
        html += '</div>';
      }
    }
    if (!html) {
      html = '<div class="empty-state"><p class="empty-sub">No hay jugadores disponibles</p></div>';
    }
    elements.pickerList.innerHTML = html;
    elements.modalPlayerPicker.classList.add("open");
  }

  function closePlayerPicker() {
    pickerTargetSlot = null;
    elements.modalPlayerPicker.classList.remove("open");
  }

  function assignSlotFromPicker(playerId) {
    if (!tempLineup || !pickerTargetSlot) return;
    // clear player from other slots
    for (var key in tempLineup.slots) {
      if (tempLineup.slots[key] === playerId) tempLineup.slots[key] = null;
    }
    tempLineup.slots[pickerTargetSlot] = playerId;
    closePlayerPicker();
    renderField();
  }

  function clearSlot(slotId) {
    if (!tempLineup) return;
    tempLineup.slots[slotId] = null;
    renderField();
  }

  function saveLineup() {
    if (!tempLineup) return;
    var match = matches.find(function (m) { return m.id === lineupTargetMatchId; });
    if (!match) return;
    tempLineup.def = parseInt(elements.lineupDef.textContent, 10);
    tempLineup.mid = parseInt(elements.lineupMid.textContent, 10);
    tempLineup.fwd = parseInt(elements.lineupFwd.textContent, 10);
    match.lineup = tempLineup;
    saveToStorage();
    closeLineupModal();
    renderMatches();
  }

  /* ────── RESULT ────── */

  function getCalledUpPlayers(match) {
    var callUps = match.callUps || [];
    return players.filter(function (p) { return callUps.indexOf(p.id) !== -1; });
  }

  function getPlayersWithBadges(match) {
    var callUps = match.callUps || [];
    var lu = match.lineup || { slots: {} };
    var result = [];
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      if (STAFF_POSITIONS.indexOf(p.position) !== -1) continue;
      var suffix = "";
      var inLineup = false;
      for (var k in lu.slots) {
        if (lu.slots.hasOwnProperty(k) && lu.slots[k] === p.id) { inLineup = true; break; }
      }
      if (inLineup) suffix = " (I)";
      else if (callUps.indexOf(p.id) !== -1) suffix = " (C)";
      else suffix = " (-)";
      result.push({ id: p.id, name: p.name + suffix, number: p.number });
    }
    return result;
  }

  function openResultModal(matchId) {
    resultTargetMatchId = matchId;
    var match = matches.find(function (m) { return m.id === matchId; });
    if (!match) return;
    elements.resultTitle.textContent = "Editar resultado";
    elements.resultRivalLabel.textContent = match.opponent;
    var scoreRow = document.querySelector(".result-score");
    if (scoreRow) {
      scoreRow.classList.toggle("result-score-away", match.venue === "visitante");
    }

    var r = match.result || { ourGoals: 0, theirGoals: 0 };
    elements.resultOurGoals.textContent = r.ourGoals;
    elements.resultTheirGoals.textContent = r.theirGoals;

    elements.resultNotes.value = match.resultNotes || "";

    renderResultGoalsList(match.goals || []);
    renderResultCardsList(match.cards || []);
    renderResultSubsList(match.substitutions || []);

    elements.modalResult.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeResultModal() {
    resultTargetMatchId = null;
    elements.modalResult.classList.remove("open");
    document.body.style.overflow = "";
  }

  function saveResult() {
    var match = matches.find(function (m) { return m.id === resultTargetMatchId; });
    if (!match) return;

    match.result = {
      ourGoals: parseInt(elements.resultOurGoals.textContent, 10) || 0,
      theirGoals: parseInt(elements.resultTheirGoals.textContent, 10) || 0
    };

    match.goals = collectResultRows("resultGoalsList", ["playerId", "minute", "assistId"]);
    match.cards = collectResultRows("resultCardsList", ["playerId", "type", "reason", "minute"]);
    match.substitutions = collectResultRows("resultSubsList", ["playerOut", "playerIn", "minute"]);

    match.resultNotes = elements.resultNotes.value.trim();

    saveToStorage();
    closeResultModal();
    renderMatches();
    if (currentView === "estadisticas") renderEstadisticas();
  }

  function collectResultRows(containerId, fields) {
    var container = document.getElementById(containerId);
    var rows = container.querySelectorAll(".result-row");
    var result = [];
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var obj = {};
      var valid = true;
      for (var f = 0; f < fields.length; f++) {
        var fieldName = fields[f];
        if (fieldName === "type") {
          var typeGroup = row.querySelector("[data-field='type']");
          if (typeGroup) {
            var activeBtn = typeGroup.querySelector(".result-card-btn.active");
            obj.type = activeBtn ? (activeBtn.dataset.value || "yellow") : "yellow";
          }
          continue;
        }
        if (fieldName === "reason") {
          var reasonGroup = row.querySelector("[data-field='type']");
          if (reasonGroup) {
            var activeBtn = reasonGroup.querySelector(".result-card-btn.active");
            obj.reason = activeBtn ? (activeBtn.dataset.reason || "necesaria") : "necesaria";
          }
          continue;
        }
        var el = row.querySelector("[data-field='" + fieldName + "']");
        if (!el) continue;
        var val = el.value !== undefined ? el.value : el.textContent;
        if (fieldName === "minute" && val) val = parseInt(val, 10);
        obj[fieldName] = val || null;
        if (fieldName === "playerId" && !val) valid = false;
        if (fieldName === "playerOut" && !val) valid = false;
        if (fieldName === "playerIn" && !val) valid = false;
      }
      if (fields[0] === "playerOut" && (!obj.playerOut || !obj.playerIn)) valid = false;
      if (valid) result.push(obj);
    }
    return result;
  }

  function makePlayerSelect(name, selected, players) {
    var select = document.createElement("select");
    select.setAttribute("data-field", name);
    var empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "—";
    select.appendChild(empty);
    for (var i = 0; i < players.length; i++) {
      var opt = document.createElement("option");
      opt.value = players[i].id;
      opt.textContent = players[i].name;
      if (selected && selected === players[i].id) opt.selected = true;
      select.appendChild(opt);
    }
    return select;
  }

  function makeMinuteInput(val) {
    var input = document.createElement("input");
    input.type = "number";
    input.min = 0;
    input.max = 99;
    input.placeholder = "min";
    input.setAttribute("data-field", "minute");
    if (val !== undefined && val !== null) input.value = val;
    return input;
  }

  function makeRemoveButton() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-row-remove";
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>';
    btn.addEventListener("click", function () { btn.parentElement.remove(); });
    return btn;
  }

  function renderResultGoalsList(goals) {
    var container = elements.resultGoalsList;
    container.innerHTML = "";
    var match = matches.find(function (m) { return m.id === resultTargetMatchId; });
    var withBadges = match ? getPlayersWithBadges(match) : [];
    for (var i = 0; i < goals.length; i++) {
      container.appendChild(createGoalRowElement(goals[i], withBadges));
    }
  }

  function createGoalRowElement(data, calledUp) {
    var div = document.createElement("div");
    div.className = "result-row";

    var goalIcon = document.createElement("span");
    goalIcon.textContent = "\u26BD";
    goalIcon.style.cssText = "font-size:14px;line-height:1";
    div.appendChild(goalIcon);

    var playerSel = makePlayerSelect("playerId", data ? data.playerId : null, calledUp);

    var minIcon = document.createElement("span");
    minIcon.textContent = "\u23F1\uFE0F";
    minIcon.style.cssText = "font-size:14px;line-height:1";
    var minInput = makeMinuteInput(data ? data.minute : null);

    var assistSel = makePlayerSelect("assistId", data ? data.assistId : null, calledUp);

    div.appendChild(goalIcon);
    div.appendChild(playerSel);
    var assistLabel = document.createElement("span");
    assistLabel.style.cssText = "font-size:14px;line-height:1";
    assistLabel.textContent = "🎯";
    div.appendChild(assistLabel);
    div.appendChild(assistSel);
    div.appendChild(minIcon);
    div.appendChild(minInput);
    div.appendChild(makeRemoveButton());
    return div;
  }

  function renderResultCardsList(cards) {
    var container = elements.resultCardsList;
    container.innerHTML = "";
    var match = matches.find(function (m) { return m.id === resultTargetMatchId; });
    var withBadges = match ? getPlayersWithBadges(match) : [];
    for (var i = 0; i < cards.length; i++) {
      container.appendChild(createCardRowElement(cards[i], withBadges));
    }
  }

  function createCardRowElement(data, calledUp) {
    var div = document.createElement("div");
    div.className = "result-row";

    var playerSel = makePlayerSelect("playerId", data ? data.playerId : null, calledUp);

    var cardGroup = document.createElement("div");
    cardGroup.className = "result-card-group";
    cardGroup.setAttribute("data-field", "type");

    function makeCardBtn(label, value, reason, isActive) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "result-card-btn" + (isActive ? " active" : "");
      btn.dataset.value = value;
      btn.dataset.reason = reason || "necesaria";
      if (reason === "innecesaria") {
        var wrap = document.createElement("span");
        wrap.className = "icon-strikethrough";
        wrap.textContent = label;
        btn.appendChild(wrap);
      } else {
        btn.textContent = label;
      }
      btn.addEventListener("click", function () {
        var siblings = cardGroup.querySelectorAll(".result-card-btn");
        for (var si = 0; si < siblings.length; si++) siblings[si].classList.remove("active");
        btn.classList.add("active");
      });
      return btn;
    }

    var activeType = data ? data.type : "yellow";
    var activeReason = data ? data.reason : "necesaria";

    cardGroup.appendChild(makeCardBtn("🟨", "yellow", "necesaria", activeType === "yellow" && activeReason === "necesaria"));
    cardGroup.appendChild(makeCardBtn("🟨", "yellow", "innecesaria", activeType === "yellow" && activeReason === "innecesaria"));
    cardGroup.appendChild(makeCardBtn("🟥", "red", "necesaria", activeType === "red" && activeReason === "necesaria"));
    cardGroup.appendChild(makeCardBtn("🟥", "red", "innecesaria", activeType === "red" && activeReason === "innecesaria"));

    var minIcon = document.createElement("span");
    minIcon.textContent = "\u23F1\uFE0F";
    minIcon.style.cssText = "font-size:14px;line-height:1";
    var minInput = makeMinuteInput(data ? data.minute : null);

    div.appendChild(cardGroup);
    div.appendChild(playerSel);
    div.appendChild(minIcon);
    div.appendChild(minInput);
    div.appendChild(makeRemoveButton());
    return div;
  }

  function renderResultSubsList(subs) {
    var container = elements.resultSubsList;
    container.innerHTML = "";
    var match = matches.find(function (m) { return m.id === resultTargetMatchId; });
    var withBadges = match ? getPlayersWithBadges(match) : [];
    for (var i = 0; i < subs.length; i++) {
      container.appendChild(createSubRowElement(subs[i], withBadges));
    }
  }

  function createSubRowElement(data, calledUp) {
    var div = document.createElement("div");
    div.className = "result-row";

    var outIcon = document.createElement("span");
    outIcon.textContent = "\u2B07\uFE0F";
    outIcon.style.cssText = "font-size:14px;line-height:1";
    var outSel = makePlayerSelect("playerOut", data ? data.playerOut : null, calledUp);

    var inIcon = document.createElement("span");
    inIcon.textContent = "\u2B06\uFE0F";
    inIcon.style.cssText = "font-size:14px;line-height:1";
    var inSel = makePlayerSelect("playerIn", data ? data.playerIn : null, calledUp);

    var minIcon = document.createElement("span");
    minIcon.textContent = "\u23F1\uFE0F";
    minIcon.style.cssText = "font-size:14px;line-height:1";
    var minInput = makeMinuteInput(data ? data.minute : null);

    div.appendChild(outIcon);
    div.appendChild(outSel);
    div.appendChild(inIcon);
    div.appendChild(inSel);
    div.appendChild(minIcon);
    div.appendChild(minInput);
    div.appendChild(makeRemoveButton());
    return div;
  }

  function addGoalRow() {
    var match = matches.find(function (m) { return m.id === resultTargetMatchId; });
    var withBadges = match ? getPlayersWithBadges(match) : [];
    elements.resultGoalsList.appendChild(createGoalRowElement(null, withBadges));
  }

  function addCardRow() {
    var match = matches.find(function (m) { return m.id === resultTargetMatchId; });
    var withBadges = match ? getPlayersWithBadges(match) : [];
    elements.resultCardsList.appendChild(createCardRowElement(null, withBadges));
  }

  function addSubRow() {
    var match = matches.find(function (m) { return m.id === resultTargetMatchId; });
    var withBadges = match ? getPlayersWithBadges(match) : [];
    elements.resultSubsList.appendChild(createSubRowElement(null, withBadges));
  }

  /* ────── STATISTICS ────── */

  var statsSortField = "min";
  var statsSortDir = -1;
  var statsMatchType = "total";

  function filterMatchesByType(matches, type) {
    if (type === "total") return matches;
    return matches.filter(function (m) { return m.type === type; });
  }

  function computeStats(typeFilter) {
    var filtered = filterMatchesByType(matches, typeFilter);
    var stats = {};
    for (var i = 0; i < players.length; i++) {
      stats[players[i].id] = { pj: 0, g: 0, e: 0, p: 0, min: 0, goals: 0, assists: 0, yellow: 0, red: 0, yellowBad: 0, redBad: 0 };
    }

    for (var m = 0; m < filtered.length; m++) {
      var match = filtered[m];
      var callUps = match.callUps || [];
      var result = match.result;
      var isWin = result && result.ourGoals > result.theirGoals;
      var isLoss = result && result.ourGoals < result.theirGoals;
      var isDraw = result && result.ourGoals === result.theirGoals;

      for (var c = 0; c < callUps.length; c++) {
        var pid = callUps[c];
        if (!stats[pid]) continue;
        stats[pid].pj++;
        if (result) {
          if (isWin) stats[pid].g++;
          else if (isLoss) stats[pid].p++;
          else stats[pid].e++;
        }
      }

      if (match.lineup) {
        var lu = match.lineup;
        var subOut = {};
        var subIn = {};
        var subs = match.substitutions || [];
        for (var s = 0; s < subs.length; s++) {
          if (subs[s].playerOut) subOut[subs[s].playerOut] = parseInt(subs[s].minute, 10) || 80;
          if (subs[s].playerIn) subIn[subs[s].playerIn] = parseInt(subs[s].minute, 10) || 80;
        }
        for (var line in lu.slots) {
          var playerId = lu.slots[line];
          if (!playerId || !stats[playerId]) continue;
          var mins = 80;
          if (subOut[playerId]) mins = subOut[playerId];
          else if (subIn[playerId]) mins = 80 - subIn[playerId];
          stats[playerId].min += mins;
        }
        for (var pid2 in subIn) {
          var isStarter = false;
          for (var _sl in lu.slots) {
            if (lu.slots[_sl] === pid2) { isStarter = true; break; }
          }
          if (!isStarter && stats[pid2]) stats[pid2].min += (80 - subIn[pid2]);
        }
      }

      var goals = match.goals || [];
      for (var g = 0; g < goals.length; g++) {
        if (goals[g].playerId && stats[goals[g].playerId]) stats[goals[g].playerId].goals++;
        if (goals[g].assistId && stats[goals[g].assistId]) stats[goals[g].assistId].assists++;
      }

      var cards = match.cards || [];
      for (var ca = 0; ca < cards.length; ca++) {
        if (!cards[ca].playerId || !stats[cards[ca].playerId]) continue;
        if (cards[ca].type === "yellow") {
          stats[cards[ca].playerId].yellow++;
          if (cards[ca].reason === "innecesaria") stats[cards[ca].playerId].yellowBad++;
        } else {
          stats[cards[ca].playerId].red++;
          if (cards[ca].reason === "innecesaria") stats[cards[ca].playerId].redBad++;
        }
      }
    }

    var arr = [];
    for (var pid in stats) {
      var p = players.find(function (pl) { return pl.id === pid; });
      if (!p) continue;
      arr.push({ id: pid, name: p.name, stats: stats[pid] });
    }

    arr.sort(function (a, b) {
      if (statsSortField === "name") {
        var cmp = a.name.localeCompare(b.name);
        return cmp * statsSortDir;
      }
      var aVal = a.stats[statsSortField] !== undefined ? a.stats[statsSortField] : 0;
      var bVal = b.stats[statsSortField] !== undefined ? b.stats[statsSortField] : 0;
      if (aVal < bVal) return -1 * statsSortDir;
      if (aVal > bVal) return 1 * statsSortDir;
      return a.name.localeCompare(b.name) * statsSortDir;
    });

    return arr;
  }

  function computeTeamStats(typeFilter) {
    var filtered = filterMatchesByType(matches, typeFilter);
    var pj = 0, g = 0, e = 0, p = 0, gf = 0, gc = 0, pts = 0;
    for (var i = 0; i < filtered.length; i++) {
      var result = filtered[i].result;
      if (!result) continue;
      pj++;
      if (result.ourGoals > result.theirGoals) { g++; pts += 3; }
      else if (result.ourGoals < result.theirGoals) { p++; }
      else { e++; pts += 1; }
      gf += result.ourGoals;
      gc += result.theirGoals;
    }
    return { pj: pj, g: g, e: e, p: p, gf: gf, gc: gc, pts: pts };
  }

  function renderEstadisticas() {
    // toggle type tab active
    var typeTabs = elements.statsTypeTabs.querySelectorAll(".stats-tab");
    for (var i = 0; i < typeTabs.length; i++) {
      typeTabs[i].classList.toggle("active", typeTabs[i].dataset.statstype === statsMatchType);
    }

    // player stats table
    var data = computeStats(statsMatchType);
    var html = "";
    for (var i = 0; i < data.length; i++) {
      var d = data[i];
      var s = d.stats;
      html += '<tr>';
      html += '<td>' + escapeHtml(d.name) + '</td>';
      html += '<td>' + s.pj + '</td>';
      html += '<td>' + s.g + '</td>';
      html += '<td>' + s.e + '</td>';
      html += '<td>' + s.p + '</td>';
      html += '<td>' + s.min + '</td>';
      html += '<td>' + s.goals + '</td>';
      html += '<td>' + s.assists + '</td>';
      html += '<td>' + s.yellow + '</td>';
      html += '<td>' + s.red + '</td>';
      html += '<td>' + s.yellowBad + '</td>';
      html += '<td>' + s.redBad + '</td>';
      html += '</tr>';
    }
    if (!html) {
      html = '<tr><td colspan="12" style="text-align:center;padding:32px;color:var(--text-light)">No hay datos disponibles</td></tr>';
    }
    elements.statsTableBody.innerHTML = html;

    // team stats card
    var t = computeTeamStats(statsMatchType);
    var items = [
      { label: "PJ", value: t.pj },
      { label: "G", value: t.g },
      { label: "E", value: t.e },
      { label: "P", value: t.p },
      { label: "GF", value: t.gf },
      { label: "GC", value: t.gc },
      { label: "Pts", value: t.pts }
    ];
    var cardHtml = "";
    for (var i = 0; i < items.length; i++) {
      cardHtml += '<div class="team-stats-item"><div class="team-stats-value">' + items[i].value + '</div><div class="team-stats-label">' + items[i].label + '</div></div>';
    }
    elements.teamStatsCard.innerHTML = cardHtml;
  }

  function setupEventListeners() {
    document.getElementById("btnGoogleLogin").addEventListener("click", handleGoogleLogin);

    document.querySelector(".header-logo-btn").addEventListener("click", function () {
      if (currentUserEmail === "roca.jlr@gmail.com") {
        showUsuarios();
      }
    });

    elements.fabOpen.addEventListener("click", function () {
      if (currentView === "plantilla") openModal(null);
      else if (currentView === "partidos") openMatchModal(null);
      else if (currentView === "usuarios") openUsuarioModal();
      else if (currentView === "seasons") {
        showConfirm("\u00BFCrear nueva temporada?", function () {
          createNewSeason();
        }, "Crear");
      }
    });
    elements.modalClose.addEventListener("click", closeModal);
    elements.modalOverlay.addEventListener("click", closeModal);
    elements.modalMatchClose.addEventListener("click", closeMatchModal);
    elements.modalMatchOverlay.addEventListener("click", closeMatchModal);
    elements.modalCallUpClose.addEventListener("click", closeCallUpModal);
    elements.modalCallUpOverlay.addEventListener("click", closeCallUpModal);
    elements.modalConfirmOverlay.addEventListener("click", closeConfirm);
    elements.btnConfirmCancel.addEventListener("click", closeConfirm);

    elements.modalLineupClose.addEventListener("click", closeLineupModal);
    elements.modalLineupOverlay.addEventListener("click", closeLineupModal);
    elements.modalPlayerPickerOverlay.addEventListener("click", closePlayerPicker);
    elements.modalPickerClose.addEventListener("click", closePlayerPicker);

    elements.modalResultClose.addEventListener("click", closeResultModal);
    elements.modalResultOverlay.addEventListener("click", closeResultModal);

    document.getElementById("modalUsuarioOverlay").addEventListener("click", closeUsuarioModal);
    document.getElementById("modalUsuarioClose").addEventListener("click", closeUsuarioModal);
    document.getElementById("usuarioForm").addEventListener("submit", function (e) {
      e.preventDefault();
      saveUsuario();
    });

    elements.btnSaveResult.addEventListener("click", saveResult);

    elements.btnResetScore.addEventListener("click", function () {
      document.getElementById("resultOurGoals").textContent = "0";
      document.getElementById("resultTheirGoals").textContent = "0";
    });

    document.getElementById("btnResetResult").addEventListener("click", function () {
      var match = matches.find(function (m) { return m.id === resultTargetMatchId; });
      if (!match) return;
      showConfirm("\u00BFResetear resultado? Se perder\u00E1n todos los datos.", function () {
        delete match.result;
        delete match.goals;
        delete match.cards;
        delete match.substitutions;
        delete match.resultNotes;
        closeResultModal();
        saveToStorage();
        renderMatches();
      });
    });

    document.getElementById("addGoalRow").addEventListener("click", addGoalRow);
    document.getElementById("addCardRow").addEventListener("click", addCardRow);
    document.getElementById("addSubRow").addEventListener("click", addSubRow);

    elements.btnSaveLineup.addEventListener("click", saveLineup);

    document.getElementById("btnResetLineup").addEventListener("click", function () {
      var match = matches.find(function (m) { return m.id === lineupTargetMatchId; });
      if (!match) return;
      showConfirm("\u00BFResetear alineaci\u00F3n?", function () {
        match.lineup = { def: 4, mid: 4, fwd: 2, slots: {} };
        tempLineup = null;
        closeLineupModal();
        saveToStorage();
        renderMatches();
      });
    });

    elements.lineupControls.addEventListener("click", function (e) {
      var btn = e.target.closest(".stepper-btn");
      if (!btn) return;
      var line = btn.dataset.line;
      var dir = parseInt(btn.dataset.dir, 10);
      var el = document.getElementById("lineup" + line.charAt(0).toUpperCase() + line.slice(1));
      if (!el) return;
      var val = parseInt(el.textContent, 10) + dir;
      if (val < 0) val = 0;
      if (val > 5) val = 5;
      var def = line === "def" ? val : parseInt(elements.lineupDef.textContent, 10);
      var mid = line === "mid" ? val : parseInt(elements.lineupMid.textContent, 10);
      var fwd = line === "fwd" ? val : parseInt(elements.lineupFwd.textContent, 10);
      if (1 + def + mid + fwd > 11) {
        showToast("⚠️ Máximo 11 jugadores", "error");
        return;
      }
      el.textContent = val;
      if (tempLineup) {
        tempLineup.def = parseInt(elements.lineupDef.textContent, 10);
        tempLineup.mid = parseInt(elements.lineupMid.textContent, 10);
        tempLineup.fwd = parseInt(elements.lineupFwd.textContent, 10);
      }
      renderField();
    });

    // result score steppers
    document.querySelectorAll(".result-stepper").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var targetId = btn.dataset.target;
        var el = document.getElementById(targetId);
        if (!el) return;
        var dir = parseInt(btn.dataset.dir, 10);
        var val = parseInt(el.textContent, 10) + dir;
        if (val < 0) val = 0;
        el.textContent = val;
      });
    });

    elements.fieldRows.addEventListener("click", function (e) {
      var slot = e.target.closest(".field-slot");
      if (!slot) return;
      var slotId = slot.dataset.slot;
      if (!tempLineup) return;
      if (tempLineup.slots[slotId]) {
        clearSlot(slotId);
      } else {
        openPlayerPicker(slotId);
      }
    });

    elements.pickerList.addEventListener("click", function (e) {
      var item = e.target.closest(".picker-item");
      if (!item) return;
      assignSlotFromPicker(item.dataset.playerId);
    });

    elements.btnConfirmOk.addEventListener("click", function () {
      if (confirmCallback) confirmCallback();
      closeConfirm();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (elements.modal.classList.contains("open")) closeModal();
        if (elements.modalMatch.classList.contains("open")) closeMatchModal();
        if (elements.modalCallUp.classList.contains("open")) closeCallUpModal();
        if (elements.modalConfirm.classList.contains("open")) closeConfirm();
        if (elements.modalLineup.classList.contains("open")) closeLineupModal();
        if (elements.modalPlayerPicker.classList.contains("open")) closePlayerPicker();
        if (elements.modalResult.classList.contains("open")) closeResultModal();
        if (document.getElementById("modalUsuario").classList.contains("open")) closeUsuarioModal();
      }
    });

    elements.playerForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = elements.nameInput.value.trim();
      if (!name) return;
      if (editingId) {
        updatePlayer(editingId, name, elements.positionSelect.value, elements.numberInput.value.trim(), elements.statusSelect.value, elements.paidToggle.classList.contains("active"), elements.playerNotes.value.trim());
      } else {
        addPlayer(name, elements.positionSelect.value, elements.numberInput.value.trim(), elements.statusSelect.value, elements.paidToggle.classList.contains("active"), elements.playerNotes.value.trim());
      }
      closeModal();
    });

    elements.paidToggle.addEventListener("click", function () {
      setPaidToggle(!elements.paidToggle.classList.contains("active"));
    });

    elements.seasonsGrid.addEventListener("click", function (e) {
      var del = e.target.closest(".btn-delete");
      if (del) {
        var card = del.closest(".season-card");
        if (!card) return;
        var seasonId = card.dataset.seasonId;
        showConfirm("\u00BFEliminar temporada " + card.querySelector(".season-card-name").textContent + "? Se borrar\u00E1n todos sus datos.", function () {
          deleteSeason(seasonId);
        });
        return;
      }
      var card = e.target.closest(".season-card");
      if (!card) return;
      if (card.dataset.seasonId) {
        setActiveSeason(card.dataset.seasonId);
        showSeasonMenu();
      }
    });

    elements.matchForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var date = elements.matchDate.value;
      var time = elements.matchTime.value;
      var opponent = elements.matchOpponent.value.trim();
      var venue = elements.matchVenue.value;
      var type = elements.matchType.value;
      var field = elements.matchField.value.trim();
      var notes = elements.matchNotes.value.trim();
      if (!date || !opponent) return;
      if (editingMatchId) {
        updateMatch(editingMatchId, date, time, opponent, venue, type, field, notes, jornadaValue);
      } else {
        addMatch(date, time, opponent, venue, type, field, notes, jornadaValue);
      }
      closeMatchModal();
    });

    elements.matchJornada.addEventListener("input", function () {
      jornadaValue = parseInt(elements.matchJornada.value, 10);
      jornadaManuallySet = true;
    });
    elements.matchType.addEventListener("change", function () {
      if (jornadaManuallySet) return;
      var auto = getNextJornada(elements.matchType.value, editingMatchId);
      elements.matchJornada.value = auto;
      jornadaValue = auto;
    });

    elements.playersList.addEventListener("click", function (e) {
      var card = e.target.closest(".player-card");
      if (!card) return;
      if (e.target.closest(".btn-delete")) {
        var name = "";
        var p = players.find(function (pl) { return pl.id === card.dataset.id; });
        if (p) name = " \"" + p.name + "\"";
        showConfirm("¿Eliminar a" + name + "?", function () { deletePlayer(card.dataset.id); });
      } else if (e.target.closest(".btn-edit")) {
        var player = players.find(function (p) { return p.id === card.dataset.id; });
        if (player) openModal(player);
      }
    });

    elements.matchesContainer.addEventListener("click", function (e) {
      var card = e.target.closest(".match-card");
      var hero = e.target.closest(".match-hero");
      var target = card || hero;
      if (!target) return;
      if (e.target.closest(".btn-delete")) {
        var mName = "";
        var mt = matches.find(function (m) { return m.id === target.dataset.id; });
        if (mt) mName = " \"" + mt.opponent + "\"";
        showConfirm("¿Eliminar partido contra" + mName + "?", function () { deleteMatch(target.dataset.id); });
      } else if (e.target.closest(".btn-edit")) {
        var match = matches.find(function (m) { return m.id === target.dataset.id; });
        if (match) openMatchModal(match);
      } else if (e.target.closest(".btn-callup")) {
        openCallUpModal(target.dataset.id);
      } else if (e.target.closest(".btn-lineup")) {
        openLineupModal(target.dataset.id);
      } else if (e.target.closest(".btn-result")) {
        openResultModal(target.dataset.id);
      }
    });

    document.getElementById("usuariosList").addEventListener("click", function (e) {
      if (e.target.closest(".btn-delete")) {
        var email = e.target.closest(".btn-delete").dataset.email;
        if (email) removeUsuario(email);
      } else if (e.target.closest(".btn-edit")) {
        var email = e.target.closest(".btn-edit").dataset.email;
        if (email) openUsuarioModal(email);
      }
    });

    elements.callUpList.addEventListener("click", function (e) {
      var toggle = e.target.closest(".callup-toggle");
      if (!toggle || toggle.classList.contains("disabled")) return;
      var item = toggle.closest(".callup-item");
      if (!item) return;
      toggleCallUp(item.dataset.playerId);
    });

    elements.btnSaveCallUp.addEventListener("click", saveCallUps);

    document.getElementById("btnResetCallUp").addEventListener("click", function () {
      var match = matches.find(function (m) { return m.id === callUpTargetMatchId; });
      if (!match) return;
      showConfirm("\u00BFResetear convocatoria?", function () {
        match.callUps = [];
        tempCallUps = [];
        closeCallUpModal();
        saveToStorage();
        renderMatches();
      });
    });

    document.getElementById("btnSelectAll").addEventListener("click", function () {
      var available = [];
      for (var i = 0; i < players.length; i++) {
        if (players[i].status === "disponible" && STAFF_POSITIONS.indexOf(players[i].position) === -1) {
          available.push(players[i].id);
        }
      }
      tempCallUps = available;
      renderCallUpList();
    });

    document.getElementById("btnDeselectAll").addEventListener("click", function () {
      tempCallUps = [];
      renderCallUpList();
    });

    // stats table sorting
    var statsTable = document.getElementById("statsTable");
    if (statsTable) {
      statsTable.querySelectorAll("th[data-sort]").forEach(function (th) {
        th.addEventListener("click", function () {
          var field = th.dataset.sort;
          if (statsSortField === field) statsSortDir *= -1;
          else { statsSortField = field; statsSortDir = -1; }
          renderEstadisticas();
        });
      });
    }

    // stats type tabs
    elements.statsTypeTabs.addEventListener("click", function (e) {
      var btn = e.target.closest(".stats-tab");
      if (!btn) return;
      statsMatchType = btn.dataset.statstype;
      renderEstadisticas();
    });

    document.querySelectorAll("[data-view]").forEach(function (btn) {
      btn.addEventListener("click", function () { switchView(btn.dataset.view); });
    });

    elements.btnBack.addEventListener("click", handleBack);
  }

  /* ────── MIGRATIONS ────── */

  function migrateJornada() {
    var changed = false;
    for (var si = 0; si < state.seasons.length; si++) {
      var ms = state.seasons[si].matches;
      var groups = { liga: [], copa: [], amistoso: [] };
      for (var mi = 0; mi < ms.length; mi++) {
        var m = ms[mi];
        if (!m.jornada) {
          groups[m.type || "amistoso"].push(m);
        }
      }
      for (var t = 0; t < MATCH_TYPE_ORDER.length; t++) {
        var type = MATCH_TYPE_ORDER[t];
        var list = groups[type];
        if (list.length === 0) continue;
        list.sort(function (a, b) { return a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""); });
        for (var li = 0; li < list.length; li++) {
          list[li].jornada = li + 1;
        }
        changed = true;
      }
    }
    if (changed) saveToStorage();
  }

  /* ────── PWA ────── */

  function registerSW() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
    }
  }

  /* ────── INIT ────── */

  function init() {
    initSupabase();

    checkSession().then(function (email) {
      if (email) {
        supabaseLoad().then(function (loaded) {
          if (!loaded) {
            loadFromStorage();
          }
          migrateJornada();
          supabaseSubscribe();
          setupEventListeners();
          showSeasons();
          registerSW();
        });
      } else {
        showLogin();
        setupEventListeners();
        registerSW();
      }
    });
  }

  init();
})();
