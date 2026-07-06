(function () {
  const STORAGE_KEY = "abvcCourseProgress.v1";
  const THEME_KEY = "abvcCourseTheme.v1";
  const PLAYLIST_WIDTH_KEY = "abvcPlaylistWidth.v1";
  const COMPLETION_GATE_SECONDS = 15;
  const PLAYLIST_MIN_WIDTH = 288;
  const PLAYLIST_MAX_WIDTH = 600;
  const MAIN_MIN_WIDTH = 520;
  const SVG_NS = "http://www.w3.org/2000/svg";
  const SKILL_ICON_PATHS = {
    strategy: '<rect x="20" y="14" width="24" height="36" rx="3"></rect><path d="M27 14v-4h10v4"></path><path d="M26 25h2.5l1.4-2.4 2.8 5 1.8-3.1H38"></path><path d="M26 36h2.5l1.4-2.4 2.8 5 1.8-3.1H38"></path><path d="M25 29h.1M38 32h.1M25 40h.1M38 43h.1"></path>',
    setting: '<circle cx="32" cy="23" r="12"></circle><path d="M24 19c5 3 11 4 18 3"></path><path d="M29 12c-1 6 0 12 4 22"></path><path d="M40 15c-5 4-8 9-9 17"></path><path d="M19 34c-4 4-5 9-2 15"></path><path d="M22 36l5 13"></path><path d="M45 34c4 4 5 9 2 15"></path><path d="M42 36l-5 13"></path>',
    serving: '<circle cx="35" cy="29" r="13"></circle><path d="M26 22c6 4 13 5 22 4"></path><path d="M34 16c-1 7 1 14 6 25"></path><path d="M46 20c-6 4-10 10-12 20"></path><path d="M13 23h7"></path><path d="M10 32h8"></path><path d="M17 42h8"></path>',
    passing: '<circle cx="42" cy="18" r="8"></circle><path d="M38 12c3 4 7 6 12 7"></path><path d="M17 31l16 16"></path><path d="M24 26l16 16"></path><path d="M12 37l10-10"></path><path d="M35 50l10-10"></path><path d="M20 48l29-29"></path>',
    target: '<circle cx="32" cy="32" r="19"></circle><circle cx="32" cy="32" r="5"></circle><path d="M32 7v14"></path><path d="M32 43v14"></path><path d="M7 32h14"></path><path d="M43 32h14"></path>',
    hitting: '<circle cx="32" cy="14" r="5"></circle><path d="M31 20l-7 13 10 6 9-14"></path><path d="M42 11l7-6"></path><path d="M42 25l8-4"></path><path d="M26 34l-13 3"></path><path d="M33 39l-2 15"></path><path d="M27 50l-9 7"></path><path d="M36 45l10 7"></path>',
    defense: '<path d="M32 9l18 7v13c0 12-7 21-18 26-11-5-18-14-18-26V16l18-7z"></path><path d="M32 16v31"></path><path d="M20 22v8c0 6 3 11 9 15"></path>',
    blocking: '<path d="M18 49V25"></path><path d="M24 49V18"></path><path d="M30 49V15"></path><path d="M36 49V18"></path><path d="M42 49V25"></path><path d="M13 35c4 0 5 4 5 8"></path><path d="M47 35c-4 0-5 4-5 8"></path><path d="M22 55h20"></path>',
    culture: '<circle cx="32" cy="20" r="7"></circle><circle cx="18" cy="25" r="6"></circle><circle cx="46" cy="25" r="6"></circle><path d="M21 50v-5c0-7 5-12 11-12s11 5 11 12v5"></path><path d="M8 50v-5c0-6 4-10 10-10"></path><path d="M56 50v-5c0-6-4-10-10-10"></path>',
    cone: '<path d="M32 12l11 38H21l11-38z"></path><path d="M25 34h14"></path><path d="M19 50h26"></path><path d="M15 56h34"></path>',
    plyos: '<circle cx="39" cy="12" r="5"></circle><path d="M35 19l-9 11 10 6 10-8"></path><path d="M26 30l-10 1"></path><path d="M36 36l-8 18"></path><path d="M28 54l-12 2"></path><path d="M39 39l11 13"></path><path d="M50 52l8-1"></path><path d="M46 28l8-2"></path>',
    module: '<rect x="17" y="15" width="14" height="14" rx="3"></rect><rect x="33" y="15" width="14" height="14" rx="3"></rect><rect x="17" y="35" width="14" height="14" rx="3"></rect><rect x="33" y="35" width="14" height="14" rx="3"></rect>',
    lesson: '<circle cx="32" cy="32" r="21"></circle><path d="M28 23l15 9-15 9V23z"></path>'
  };

  const state = {
    data: null,
    nodesById: new Map(),
    parentsById: new Map(),
    lessons: [],
    openIds: new Set(),
    selectedId: null,
    search: "",
    progress: {
      viewed: [],
      completed: [],
      lastLessonId: null
    },
    completionGate: {
      lessonId: null,
      timerId: null,
      remaining: COMPLETION_GATE_SECONDS,
      unlocked: false
    }
  };

  const els = {
    appShell: document.getElementById("appShell"),
    sidebar: document.getElementById("courseSidebar"),
    brandHomeButton: document.getElementById("brandHomeButton"),
    sidebarToggle: document.getElementById("sidebarToggle"),
    mobileMenuButton: document.getElementById("mobileMenuButton"),
    sidebarBackdrop: document.getElementById("sidebarBackdrop"),
    tree: document.getElementById("courseTree"),
    search: document.getElementById("courseSearch"),
    progressLabel: document.getElementById("progressLabel"),
    lessonCount: document.getElementById("lessonCount"),
    progressFill: document.getElementById("progressFill"),
    resumeButton: document.getElementById("resumeButton"),
    resetButton: document.getElementById("resetProgressButton"),
    themeToggle: document.getElementById("themeToggle"),
    themeLabel: document.getElementById("themeLabel"),
    backButton: document.getElementById("backButton"),
    lessonPath: document.getElementById("lessonPath"),
    lessonTitle: document.getElementById("lessonTitle"),
    lessonDescription: document.getElementById("lessonDescription"),
    lessonStatus: document.getElementById("lessonStatus"),
    skillHub: document.getElementById("skillHub"),
    playlistPanel: document.getElementById("playlistPanel"),
    playlistResizeHandle: document.getElementById("playlistResizeHandle"),
    coursePlaylist: document.getElementById("coursePlaylist"),
    playerPanel: document.querySelector(".player-panel"),
    mobileLessonProgress: document.getElementById("mobileLessonProgress"),
    mobileModulePanel: document.getElementById("mobileModulePanel"),
    mobileCoursePlaylist: document.getElementById("mobileCoursePlaylist"),
    lessonActions: document.querySelector(".lesson-actions"),
    seriesCompletePanel: document.getElementById("seriesCompletePanel"),
    lessonDetails: document.querySelector(".lesson-details"),
    videoMount: document.getElementById("videoMount"),
    completeButton: document.getElementById("completeButton"),
    nextButton: document.getElementById("nextButton"),
    notesList: document.getElementById("notesList"),
    drillsList: document.getElementById("drillsList")
  };

  init();

  async function init() {
    loadTheme();
    loadPlaylistWidth();
    bindEvents();
    loadProgress();

    try {
      const response = await fetch("course-data.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Could not load course data (${response.status})`);
      }

      state.data = await response.json();
      indexCourse();
      openFirstLevel();
      render();
      selectInitialContent();
    } catch (error) {
      renderError(error);
    }
  }

  function bindEvents() {
    els.mobileMenuButton.setAttribute("aria-expanded", "false");

    els.brandHomeButton.addEventListener("click", function () {
      goHome();
    });

    window.addEventListener("popstate", applyRouteFromLocation);
    window.addEventListener("resize", clampPlaylistWidthToViewport);

    els.sidebarToggle.addEventListener("click", function () {
      if (isMobileLayout()) {
        closeMobileSidebar();
        return;
      }
      toggleSidebarCollapse();
    });

    els.mobileMenuButton.addEventListener("click", function () {
      openMobileSidebar();
    });

    els.sidebarBackdrop.addEventListener("click", function () {
      closeMobileSidebar();
    });

    els.playlistResizeHandle.addEventListener("pointerdown", startPlaylistResize);
    els.playlistResizeHandle.addEventListener("dblclick", resetPlaylistWidth);

    els.backButton.addEventListener("click", function () {
      goBack();
    });

    els.themeToggle.addEventListener("click", function () {
      const currentTheme = document.documentElement.dataset.theme || "dark";
      setTheme(currentTheme === "dark" ? "light" : "dark");
    });

    els.search.addEventListener("input", function (event) {
      state.search = event.target.value.trim().toLowerCase();
      if (state.search) {
        openMatchingAncestors();
      }
      renderTree();
      if (state.search) {
        setContentMode("hub");
        updateBackButton();
        hideLessonDescription();
        renderSearchAwareHub();
      } else if (!els.skillHub.hidden) {
        renderSearchAwareHub();
      }
    });

    els.resumeButton.addEventListener("click", function () {
      const lesson = getResumeLesson();
      if (lesson) {
        selectNode(lesson.id);
      }
    });

    els.resetButton.addEventListener("click", function () {
      const confirmed = window.confirm("Reset course progress on this device?");
      if (!confirmed) return;

      state.progress = { viewed: [], completed: [], lastLessonId: null };
      saveProgress();
      render();
      if (state.selectedId) {
        selectNode(state.selectedId, { skipViewedUpdate: true });
      } else {
        renderOverview();
      }
    });

    els.completeButton.addEventListener("click", function () {
      const selected = state.nodesById.get(state.selectedId);
      if (!selected || selected.type !== "lesson") return;

      toggleComplete(selected.id);
    });

    els.nextButton.addEventListener("click", function () {
      const next = getNextLesson();
      if (next) {
        selectNode(next.id);
        return;
      }

      const selected = state.selectedId ? state.nodesById.get(state.selectedId) : null;
      const nextSeries = selected && selected.type === "lesson" ? getNextSeriesTarget(selected) : null;
      if (nextSeries) {
        animateSeriesAdvance(nextSeries);
      }
    });
  }

  function loadTheme() {
    let theme = "dark";
    try {
      const stored = window.localStorage.getItem(THEME_KEY);
      if (stored === "light" || stored === "dark") {
        theme = stored;
      }
    } catch (error) {
      theme = "dark";
    }

    setTheme(theme, { skipSave: true });
  }

  function setTheme(theme, options) {
    document.documentElement.dataset.theme = theme;
    els.themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
    els.themeLabel.textContent = theme === "dark" ? "Dark" : "Light";

    if (!options || !options.skipSave) {
      try {
        window.localStorage.setItem(THEME_KEY, theme);
      } catch (error) {
        return;
      }
    }
  }

  function toggleSidebarCollapse() {
    const collapsed = !els.appShell.classList.contains("is-sidebar-collapsed");
    els.appShell.classList.toggle("is-sidebar-collapsed", collapsed);
    els.sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
    els.sidebarToggle.setAttribute("aria-label", collapsed ? "Expand course navigation" : "Collapse course navigation");
  }

  function openMobileSidebar() {
    els.appShell.classList.add("is-sidebar-open");
    els.mobileMenuButton.setAttribute("aria-expanded", "true");
  }

  function closeMobileSidebar() {
    els.appShell.classList.remove("is-sidebar-open");
    els.mobileMenuButton.setAttribute("aria-expanded", "false");
  }

  function getSidebarWidth() {
    return els.sidebar.getBoundingClientRect().width || 0;
  }

  function getMaxPlaylistWidth() {
    const availableWidth = window.innerWidth - getSidebarWidth() - MAIN_MIN_WIDTH;
    return Math.max(PLAYLIST_MIN_WIDTH, Math.min(PLAYLIST_MAX_WIDTH, availableWidth));
  }

  function clampPlaylistWidth(width) {
    const maxWidth = getMaxPlaylistWidth();
    return Math.min(Math.max(width, PLAYLIST_MIN_WIDTH), maxWidth);
  }

  function getCurrentPlaylistWidth() {
    const value = window.getComputedStyle(document.documentElement).getPropertyValue("--playlist-width");
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
    return Math.min(420, getMaxPlaylistWidth());
  }

  function setPlaylistWidth(width, options) {
    const nextWidth = clampPlaylistWidth(width);
    document.documentElement.style.setProperty("--playlist-width", `${Math.round(nextWidth)}px`);

    if (!options || !options.skipSave) {
      try {
        window.localStorage.setItem(PLAYLIST_WIDTH_KEY, String(Math.round(nextWidth)));
      } catch (error) {
        return;
      }
    }
  }

  function loadPlaylistWidth() {
    try {
      const stored = Number.parseFloat(window.localStorage.getItem(PLAYLIST_WIDTH_KEY));
      if (Number.isFinite(stored)) {
        setPlaylistWidth(stored, { skipSave: true });
      }
    } catch (error) {
      return;
    }
  }

  function clampPlaylistWidthToViewport() {
    if (isMobileLayout()) return;
    setPlaylistWidth(getCurrentPlaylistWidth(), { skipSave: true });
  }

  function resetPlaylistWidth() {
    setPlaylistWidth(Math.min(420, getMaxPlaylistWidth()));
  }

  function setPlaylistCollapsed(collapsed, toggle) {
    els.appShell.classList.toggle("is-playlist-collapsed", collapsed);

    if (toggle) {
      toggle.textContent = collapsed ? "Expand" : "Collapse";
      toggle.setAttribute("aria-expanded", String(!collapsed));
    }
  }

  function startPlaylistResize(event) {
    if (isMobileLayout() || els.appShell.classList.contains("is-playlist-collapsed")) return;

    event.preventDefault();
    els.appShell.classList.add("is-resizing-playlist");

    const startX = event.clientX;
    const startWidth = els.playlistPanel.getBoundingClientRect().width;

    function handlePointerMove(moveEvent) {
      const nextWidth = startWidth + startX - moveEvent.clientX;
      setPlaylistWidth(nextWidth, { skipSave: true });
    }

    function handlePointerUp() {
      els.appShell.classList.remove("is-resizing-playlist");
      setPlaylistWidth(getCurrentPlaylistWidth());
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  }

  function closeMobileSidebarAfterNavigation() {
    if (isMobileLayout()) {
      closeMobileSidebar();
    }
  }

  function isMobileLayout() {
    return window.matchMedia("(max-width: 920px)").matches;
  }

  function loadProgress() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      state.progress = {
        viewed: Array.isArray(parsed.viewed) ? parsed.viewed : [],
        completed: Array.isArray(parsed.completed) ? parsed.completed : [],
        lastLessonId: typeof parsed.lastLessonId === "string" ? parsed.lastLessonId : null
      };
    } catch (error) {
      state.progress = { viewed: [], completed: [], lastLessonId: null };
    }
  }

  function saveProgress() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
  }

  function indexCourse() {
    state.nodesById.clear();
    state.parentsById.clear();
    state.lessons = [];

    const modules = state.data.course.modules || [];
    modules.forEach(function (node) {
      indexNode(node, null);
    });
  }

  function indexNode(node, parent) {
    state.nodesById.set(node.id, node);
    state.parentsById.set(node.id, parent);

    if (node.type === "lesson") {
      state.lessons.push(node);
    }

    (node.children || []).forEach(function (child) {
      indexNode(child, node);
    });
  }

  function openFirstLevel() {
    state.openIds.clear();

    if (state.progress.lastLessonId && state.nodesById.has(state.progress.lastLessonId)) {
      getAncestors(state.progress.lastLessonId).forEach(function (ancestor) {
        state.openIds.add(ancestor.id);
      });
    }
  }

  function render() {
    renderProgress();
    renderTree();
  }

  function renderProgress() {
    const readyLessons = state.lessons.filter(isLessonReady);
    const total = readyLessons.length;
    const completed = readyLessons.filter(function (lesson) {
      return state.progress.completed.includes(lesson.id);
    }).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    els.progressLabel.textContent = `${percent}% complete`;
    els.lessonCount.textContent = `${completed}/${total} videos`;
    els.progressFill.style.width = `${percent}%`;
    els.resumeButton.disabled = !getResumeLesson();
  }

  function isLessonReady(lesson) {
    return Boolean(
      lesson &&
      (lesson.status === "ready" || lesson.videoId || lesson.videoUrl || lesson.youtubeUrl)
    );
  }

  function getReadyStats(lessons) {
    const total = lessons.length;
    const ready = lessons.filter(isLessonReady).length;
    return { ready: ready, total: total };
  }

  function renderTree() {
    els.tree.replaceChildren();
    const modules = state.data.course.modules || [];
    const fragment = document.createDocumentFragment();

    modules.forEach(function (node) {
      const rendered = renderNode(node, 0);
      if (rendered) {
        fragment.appendChild(rendered);
      }
    });

    if (!fragment.childNodes.length) {
      const empty = document.createElement("p");
      empty.className = "empty-note";
      empty.textContent = "No modules match that search.";
      fragment.appendChild(empty);
    }

    els.tree.appendChild(fragment);
  }

  function renderNode(node, depth) {
    const matches = nodeMatchesSearch(node);
    const children = (node.children || [])
      .map(function (child) {
        return renderNode(child, depth + 1);
      })
      .filter(Boolean);

    if (state.search && !matches && children.length === 0) {
      return null;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "tree-node";

    const row = document.createElement("button");
    row.type = "button";
    row.className = "tree-row";
    row.dataset.nodeType = node.type;
    row.dataset.empty = String(node.type !== "lesson" && (node.children || []).length === 0);
    row.style.paddingLeft = `${0.6 + Math.min(depth, 4) * 0.2}rem`;
    row.dataset.open = String(state.openIds.has(node.id));
    row.setAttribute("aria-current", String(state.selectedId === node.id));
    row.title = getDisplayTitle(node);
    row.addEventListener("click", function () {
      handleNodeClick(node);
    });

    if (node.type === "lesson" && state.progress.completed.includes(node.id)) {
      row.classList.add("is-complete");
    }

    if (node.type === "lesson" && !isLessonReady(node)) {
      row.classList.add("is-coming-soon");
    }

    const toggle = document.createElement("span");
    toggle.className = "tree-toggle";
    toggle.textContent = node.type === "lesson" || !(node.children || []).length ? "•" : "›";
    row.appendChild(toggle);

    const title = document.createElement("span");
    title.className = "tree-title";
    title.textContent = getDisplayTitle(node);
    row.appendChild(title);

    const meta = document.createElement("span");
    meta.className = "tree-meta";
    meta.textContent = getNodeMeta(node);
    row.appendChild(meta);

    wrapper.appendChild(row);

    if (node.type !== "lesson" && (node.children || []).length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-note";
      empty.textContent = "Lessons can be added here later.";
      wrapper.appendChild(empty);
    }

    if (children.length > 0) {
      const childWrap = document.createElement("div");
      childWrap.className = "tree-children";
      if (state.openIds.has(node.id) || state.search) {
        childWrap.classList.add("is-open");
      }
      children.forEach(function (child) {
        childWrap.appendChild(child);
      });
      wrapper.appendChild(childWrap);
    }

    return wrapper;
  }

  function handleNodeClick(node) {
    if ((node.children || []).length > 0) {
      state.openIds.add(node.id);
    }

    enterCourseNode(node);
    closeMobileSidebarAfterNavigation();
    renderTree();
  }

  function enterCourseNode(node) {
    if (!node) return;
    if (node.type === "lesson") {
      selectNode(node.id);
      return;
    }

    if (!hasSubsections(node)) {
      const lesson = getRecommendedLesson(node);
      if (lesson) {
        selectNode(lesson.id);
        return;
      }
    }

    selectNode(node.id, { skipViewedUpdate: true });
  }

  function getRouteFromLocation() {
    const hash = window.location.hash.replace(/^#\/?/, "");
    if (!hash) return null;

    const parts = hash.split("/");
    const routeType = parts.shift();
    const id = decodeURIComponent(parts.join("/"));
    if ((routeType !== "module" && routeType !== "lesson") || !id) {
      return null;
    }

    return { type: routeType, id };
  }

  function getHomeUrl() {
    return `${window.location.pathname}${window.location.search}`;
  }

  function getNodeUrl(node) {
    const routeType = node.type === "lesson" ? "lesson" : "module";
    return `${window.location.pathname}${window.location.search}#/${routeType}/${encodeURIComponent(node.id)}`;
  }

  function replaceRoute(url, routeState) {
    if (window.location.pathname + window.location.search + window.location.hash === url) return;
    window.history.replaceState(routeState, "", url);
  }

  function pushRoute(url, routeState) {
    if (window.location.pathname + window.location.search + window.location.hash === url) return;
    window.history.pushState(routeState, "", url);
  }

  function updateRouteForNode(node, options) {
    if (!node || (options && options.skipRoute)) return;

    const url = getNodeUrl(node);
    const routeState = { abvcRoute: node.id };
    const hasViewerRoute = Boolean(getRouteFromLocation());
    if (hasViewerRoute || (options && options.replaceRoute)) {
      replaceRoute(url, routeState);
      return;
    }

    pushRoute(url, routeState);
  }

  function updateRouteForHome(options) {
    if (options && options.skipRoute) return;
    replaceRoute(getHomeUrl(), { abvcRoute: "home" });
  }

  function applyRouteFromLocation() {
    const route = getRouteFromLocation();
    if (route) {
      const node = state.nodesById.get(route.id);
      if (node) {
        selectNode(node.id, { skipViewedUpdate: true, skipRoute: true });
        return;
      }
    }

    goHome({ skipRoute: true });
  }

  function goHome(options) {
    clearCompletionGate();
    state.search = "";
    els.search.value = "";
    renderOverview(options);
    render();
    closeMobileSidebarAfterNavigation();
    scrollMobileContentToTop();
  }

  function goBack() {
    goHome();
  }

  function selectInitialContent() {
    applyRouteFromLocation();
  }

  function selectNode(id, options) {
    const node = state.nodesById.get(id);
    if (!node) return;

    clearCompletionGate();
    state.selectedId = id;
    updateRouteForNode(node, options);
    getAncestors(id).forEach(function (ancestor) {
      state.openIds.add(ancestor.id);
    });

    if (node.type === "lesson") {
      if (!options || !options.skipViewedUpdate) {
        pushUnique(state.progress.viewed, node.id);
        state.progress.lastLessonId = node.id;
        saveProgress();
      }
      renderLesson(node);
    } else {
      renderModule(node);
    }

    render();
    scrollMobileContentToTop();
  }

  function renderOverview(options) {
    const stats = getReadyStats(state.lessons);
    clearTags();
    state.selectedId = null;
    updateRouteForHome(options);
    setContentMode("hub");
    updateBackButton();
    hideLessonDescription();
    hidePlaylist();
    els.lessonPath.textContent = "American Beach Volleyball Club";
    els.lessonTitle.textContent = state.data.course.title;
    els.lessonStatus.textContent = `${stats.ready}/${stats.total} lessons`;
    renderSkillHub({
      title: "Choose Your Skill",
      nodes: state.data.course.modules || [],
      showResume: true,
      variant: "overview"
    });
    els.completeButton.disabled = true;
    els.nextButton.disabled = state.lessons.length === 0;
  }

  function renderModule(module) {
    clearTags();
    setContentMode("hub");
    updateBackButton();
    hideLessonDescription();
    const lessons = getDescendantLessons(module);
    const stats = getReadyStats(lessons);

    els.lessonPath.textContent = getPath(module.id);
    els.lessonTitle.textContent = getDisplayTitle(module);
    els.lessonStatus.textContent = lessons.length ? `${stats.ready}/${stats.total} videos` : "Coming soon";
    if ((module.children || []).some(function (child) { return child.type !== "lesson"; })) {
      renderSkillHub({
        title: "Choose a Section",
        nodes: module.children || [],
        emptyText: "No videos have been added here yet."
      });
    } else {
      renderSkillHub({
        title: "Lessons",
        nodes: module.children || [],
        emptyText: "No videos have been added here yet."
      });
    }
    renderPlaylist({
      title: module.title,
      lessons: lessons,
      activeLessonId: null
    });

    els.completeButton.disabled = true;
    els.nextButton.disabled = !getNextLesson();
  }

  function renderLesson(lesson) {
    setContentMode("lesson");
    updateBackButton();
    hideLessonDescription();
    els.lessonPath.textContent = getPath(lesson.id);
    els.lessonTitle.textContent = getDisplayTitle(lesson);

    renderVideo(lesson);
    refreshLessonChrome(lesson);
    renderMobileLessonProgress(lesson);
  }

  function setContentMode(mode) {
    const isLesson = mode === "lesson";
    els.appShell.dataset.mode = mode;
    els.skillHub.hidden = isLesson;
    els.playerPanel.hidden = !isLesson;
    els.mobileLessonProgress.hidden = !isLesson;
    els.mobileModulePanel.hidden = !isLesson;
    els.lessonActions.hidden = !isLesson;
    els.seriesCompletePanel.hidden = true;
    els.seriesCompletePanel.replaceChildren();
    els.lessonDetails.hidden = true;
  }

  function hideLessonDescription() {
    els.lessonDescription.textContent = "";
    els.lessonDescription.hidden = true;
  }

  function updateBackButton() {
    const selected = state.selectedId ? state.nodesById.get(state.selectedId) : null;
    els.backButton.hidden = !selected;
    if (!selected) return;

    els.backButton.textContent = "←";
    els.backButton.setAttribute("aria-label", "Back to Skills");
    els.backButton.title = "Back to Skills";
  }

  function hidePlaylist() {
    els.appShell.classList.remove("has-playlist");
    els.playlistPanel.hidden = true;
    els.coursePlaylist.hidden = true;
    els.coursePlaylist.replaceChildren();
    els.mobileModulePanel.hidden = true;
    els.mobileCoursePlaylist.hidden = true;
    els.mobileCoursePlaylist.replaceChildren();
    els.seriesCompletePanel.hidden = true;
    els.seriesCompletePanel.replaceChildren();
  }

  function renderPlaylist(options) {
    const lessons = options.lessons || [];
    if (!lessons.length) {
      hidePlaylist();
      return;
    }

    const readyLessons = lessons.filter(isLessonReady);
    const completed = readyLessons.filter(function (lesson) {
      return state.progress.completed.includes(lesson.id);
    }).length;
    const percent = readyLessons.length === 0 ? 0 : Math.round((completed / readyLessons.length) * 100);
    const comingSoon = lessons.length - readyLessons.length;

    els.appShell.classList.add("has-playlist");
    els.playlistPanel.hidden = false;
    els.coursePlaylist.hidden = false;
    els.coursePlaylist.classList.remove("is-collapsed");
    els.coursePlaylist.replaceChildren();

    const header = document.createElement("div");
    header.className = "playlist-header";

    const copy = document.createElement("div");
    copy.className = "playlist-heading";

    const eyebrow = document.createElement("p");
    eyebrow.className = "playlist-eyebrow";
    eyebrow.textContent = "Current Module";

    const title = document.createElement("h3");
    title.className = "playlist-title";
    title.textContent = getDisplayTitle(options.title);
    copy.append(eyebrow, title);

    const count = document.createElement("span");
    count.className = "playlist-count";
    count.textContent = `${completed}/${readyLessons.length} complete`;

    const toggle = document.createElement("button");
    toggle.className = "playlist-toggle";
    toggle.type = "button";
    const desktopPlaylistCollapsed = !isMobileLayout() && els.appShell.classList.contains("is-playlist-collapsed");
    toggle.textContent = isMobileLayout()
      ? "Hide"
      : (desktopPlaylistCollapsed ? "Expand" : "Collapse");
    toggle.setAttribute("aria-expanded", String(!desktopPlaylistCollapsed));
    toggle.addEventListener("click", function () {
      if (isMobileLayout()) {
        const collapsed = !els.coursePlaylist.classList.contains("is-collapsed");
        els.coursePlaylist.classList.toggle("is-collapsed", collapsed);
        toggle.textContent = collapsed ? "Show" : "Hide";
        toggle.setAttribute("aria-expanded", String(!collapsed));
        return;
      }

      const collapsed = !els.appShell.classList.contains("is-playlist-collapsed");
      setPlaylistCollapsed(collapsed, toggle);
    });

    header.append(copy, count, toggle);

    const summary = document.createElement("div");
    summary.className = "playlist-summary";

    const ready = document.createElement("span");
    ready.textContent = `${readyLessons.length} videos`;

    const soon = document.createElement("span");
    soon.textContent = `${comingSoon} coming soon`;

    summary.append(ready, soon);

    const progress = document.createElement("div");
    progress.className = "playlist-progress";
    progress.setAttribute("aria-hidden", "true");
    const fill = document.createElement("span");
    fill.style.width = `${percent}%`;
    progress.appendChild(fill);

    const list = document.createElement("div");
    list.className = "playlist-list";

    lessons.forEach(function (lesson, index) {
      list.appendChild(createPlaylistRow(lesson, index, options.activeLessonId));
    });

    els.coursePlaylist.append(header, summary, progress, list);
    renderMobilePlaylist(options, {
      readyLessons: readyLessons,
      completed: completed,
      percent: percent,
      comingSoon: comingSoon
    });
  }

  function renderMobilePlaylist(options, stats) {
    const lessons = options.lessons || [];
    if (!options.activeLessonId || !lessons.length) {
      els.mobileModulePanel.hidden = true;
      els.mobileCoursePlaylist.hidden = true;
      els.mobileCoursePlaylist.replaceChildren();
      return;
    }

    const currentIndex = lessons.findIndex(function (lesson) {
      return lesson.id === options.activeLessonId;
    });
    const nextLesson = getNextReadyLessonInList(lessons, options.activeLessonId);

    els.mobileModulePanel.hidden = false;
    els.mobileCoursePlaylist.hidden = false;
    els.mobileCoursePlaylist.classList.remove("is-collapsed");
    els.mobileCoursePlaylist.replaceChildren();

    const header = document.createElement("div");
    header.className = "playlist-header";

    const copy = document.createElement("div");
    copy.className = "playlist-heading";

    const eyebrow = document.createElement("p");
    eyebrow.className = "playlist-eyebrow";
    eyebrow.textContent = "Current Module";

    const title = document.createElement("h3");
    title.className = "playlist-title";
    title.textContent = getDisplayTitle(options.title);
    copy.append(eyebrow, title);

    const count = document.createElement("span");
    count.className = "playlist-count";
    count.textContent = `${stats.completed}/${stats.readyLessons.length}`;

    const toggle = document.createElement("button");
    toggle.className = "playlist-toggle";
    toggle.type = "button";
    toggle.textContent = "Hide";
    toggle.setAttribute("aria-expanded", "true");
    toggle.addEventListener("click", function () {
      const collapsed = !els.mobileCoursePlaylist.classList.contains("is-collapsed");
      els.mobileCoursePlaylist.classList.toggle("is-collapsed", collapsed);
      toggle.textContent = collapsed ? "Lessons" : "Hide";
      toggle.setAttribute("aria-expanded", String(!collapsed));
    });

    header.append(copy, count, toggle);

    const summary = document.createElement("div");
    summary.className = "playlist-summary";

    const lessonCount = document.createElement("span");
    lessonCount.textContent = `${lessons.length} lessons`;

    const soon = document.createElement("span");
    soon.textContent = `${stats.comingSoon} coming soon`;
    summary.append(lessonCount, soon);

    const progress = document.createElement("div");
    progress.className = "playlist-progress";
    progress.setAttribute("aria-hidden", "true");
    const fill = document.createElement("span");
    fill.style.width = `${stats.percent}%`;
    progress.appendChild(fill);

    const upNext = document.createElement("div");
    upNext.className = "mobile-up-next";
    const upNextLabel = document.createElement("span");
    upNextLabel.textContent = nextLesson ? "Up next" : "End of module";
    const upNextButton = document.createElement("button");
    upNextButton.type = "button";
    upNextButton.textContent = nextLesson ? getDisplayTitle(nextLesson) : "Review this module";
    upNextButton.disabled = !nextLesson;
    if (nextLesson) {
      upNextButton.addEventListener("click", function () {
        selectNode(nextLesson.id);
      });
    }
    upNext.append(upNextLabel, upNextButton);

    const list = document.createElement("div");
    list.className = "playlist-list";
    lessons.forEach(function (lesson, index) {
      list.appendChild(createPlaylistRow(lesson, index, options.activeLessonId));
    });

    els.mobileCoursePlaylist.append(header, summary, progress, upNext, list);
  }

  function renderMobileLessonProgress(lesson) {
    els.mobileLessonProgress.replaceChildren();
    if (!lesson || lesson.type !== "lesson") {
      els.mobileLessonProgress.hidden = true;
      return;
    }

    const scope = getLessonScope(lesson);
    const currentIndex = scope.lessons.findIndex(function (item) {
      return item.id === lesson.id;
    });
    const total = scope.lessons.length;
    if (currentIndex < 0 || total <= 1) {
      els.mobileLessonProgress.hidden = true;
      return;
    }

    els.mobileLessonProgress.hidden = false;

    const label = document.createElement("span");
    label.className = "mobile-progress-label";
    label.textContent = `Lesson ${currentIndex + 1}/${total}`;

    const track = document.createElement("div");
    track.className = "mobile-progress-track";
    const maxMarks = Math.min(total, 12);
    const activeMark = Math.round((currentIndex / Math.max(total - 1, 1)) * (maxMarks - 1));

    for (let index = 0; index < maxMarks; index += 1) {
      const mark = document.createElement("span");
      mark.className = "mobile-progress-mark";
      if (index < activeMark) {
        mark.dataset.state = "past";
      } else if (index === activeMark) {
        mark.dataset.state = "current";
      }
      track.appendChild(mark);
    }

    const videosButton = document.createElement("button");
    videosButton.className = "mobile-video-list-button";
    videosButton.type = "button";
    videosButton.textContent = "Videos";
    videosButton.addEventListener("click", scrollToMobilePlaylist);

    els.mobileLessonProgress.append(label, track, videosButton);
  }

  function scrollToMobilePlaylist() {
    if (els.mobileModulePanel.hidden) return;
    els.mobileModulePanel.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function createPlaylistRow(lesson, index, activeLessonId) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "playlist-row";
    row.title = getDisplayTitle(lesson);
    row.setAttribute("aria-current", String(lesson.id === activeLessonId));

    if (state.progress.completed.includes(lesson.id)) {
      row.classList.add("is-complete");
    }

    if (!isLessonReady(lesson)) {
      row.classList.add("is-coming-soon");
    }

    row.addEventListener("click", function () {
      selectNode(lesson.id);
    });

    const number = document.createElement("span");
    number.className = "playlist-number";
    number.textContent = String(index + 1).padStart(2, "0");

    const title = document.createElement("span");
    title.className = "playlist-row-title";
    title.textContent = getDisplayTitle(lesson);

    const status = document.createElement("span");
    status.className = "playlist-row-status";
    status.textContent = getLessonStatusLabel(lesson);

    row.append(number, title, status);
    return row;
  }

  function renderSkillHub(options) {
    els.skillHub.replaceChildren();
    els.skillHub.dataset.hub = options.variant || "section";

    const header = document.createElement("div");
    header.className = "hub-header";

    const copy = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "hub-title";
    title.textContent = options.title;
    copy.appendChild(title);
    header.appendChild(copy);

    if (options.showResume) {
      const resume = state.progress.lastLessonId ? getResumeLesson() : null;
      if (resume) {
        const resumeButton = document.createElement("button");
        resumeButton.type = "button";
        resumeButton.className = "button button-primary hub-resume";
        resumeButton.textContent = "Resume";
        resumeButton.title = `Resume ${getDisplayTitle(resume)}`;
        resumeButton.addEventListener("click", function () {
          selectNode(resume.id);
        });
        header.appendChild(resumeButton);
      }
    }

    const grid = document.createElement("div");
    grid.className = "skill-grid";

    const nodes = options.nodes || [];
    if (!nodes.length) {
      const empty = document.createElement("p");
      empty.className = "hub-empty";
      empty.textContent = options.emptyText || "No skills have been added here yet.";
      grid.appendChild(empty);
    } else {
      nodes.forEach(function (node) {
        grid.appendChild(createSkillCard(node, options.variant));
      });
    }

    els.skillHub.append(header, grid);
  }

  function renderSearchAwareHub() {
    if (!state.search) {
      const selected = state.selectedId ? state.nodesById.get(state.selectedId) : null;
      if (selected && selected.type !== "lesson") {
        renderModule(selected);
      } else {
        renderOverview();
      }
      return;
    }

    const matches = Array.from(state.nodesById.values())
      .filter(nodeMatchesSearch)
      .slice(0, 24);

    renderSkillHub({
      title: "Search Results",
      nodes: matches,
      emptyText: "No skills or videos match that search yet."
    });
    hidePlaylist();
  }

  function createSkillCard(node, variant) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "skill-card";
    card.dataset.nodeType = node.type;
    card.dataset.cardVariant = variant || "section";
    card.setAttribute("aria-label", getSkillCardAriaLabel(node));
    card.addEventListener("click", function () {
      if (node.type !== "lesson") {
        state.openIds.add(node.id);
      }
      enterCourseNode(node);
    });

    const icon = document.createElement("span");
    icon.className = "skill-card-icon";
    icon.dataset.icon = getSkillIconName(node);
    icon.setAttribute("aria-hidden", "true");
    icon.appendChild(createSkillIcon(icon.dataset.icon));

    const title = document.createElement("strong");
    title.className = "skill-card-title";
    title.textContent = getSkillCardTitle(node);

    const count = document.createElement("span");
    count.className = "skill-card-count";
    count.textContent = getSkillCardMeta(node);

    const progress = document.createElement("span");
    progress.className = "skill-card-progress";
    progress.setAttribute("aria-hidden", "true");

    const progressFill = document.createElement("span");
    progressFill.style.width = `${getSkillCardProgress(node)}%`;
    progress.appendChild(progressFill);

    card.append(icon, title, count, progress);
    return card;
  }

  function getSkillCardMeta(node) {
    if (node.type === "lesson") {
      return isLessonReady(node) ? "1 lesson" : "Coming soon";
    }

    const lessons = getDescendantLessons(node);
    return lessons.length ? formatLessonCount(lessons.length) : "Coming soon";
  }

  function getSkillCardProgress(node) {
    const readyLessons = getDescendantLessons(node).filter(isLessonReady);
    const completed = readyLessons.filter(function (lesson) {
      return state.progress.completed.includes(lesson.id);
    }).length;
    return readyLessons.length ? Math.round((completed / readyLessons.length) * 100) : 0;
  }

  function getSkillCardAriaLabel(node) {
    const readyLessons = getDescendantLessons(node).filter(isLessonReady);
    const completed = readyLessons.filter(function (lesson) {
      return state.progress.completed.includes(lesson.id);
    }).length;
    const progressText = readyLessons.length ? `${completed} of ${readyLessons.length} complete` : "no ready lessons";
    return `Open ${getSkillCardTitle(node)}, ${getSkillCardMeta(node)}, ${progressText}`;
  }

  function formatLessonCount(count) {
    return `${count} lesson${count === 1 ? "" : "s"}`;
  }

  function getSkillCardTitle(node) {
    const title = getDisplayTitle(node);
    if (node && node.id === "on-2-mindset-attack-on-two") {
      return "Attack on Two";
    }
    return title;
  }

  function getSkillIconName(node) {
    if (!node) return "module";
    if (node.type === "lesson") return "lesson";

    const title = getDisplayTitle(node).toLowerCase();
    if (node.id === "strategy" || title.includes("strategy")) return "strategy";
    if (node.id === "setting" || title.includes("setting")) return "setting";
    if (node.id === "serving" || title.includes("serving")) return "serving";
    if (node.id === "passing" || title.includes("passing")) return "passing";
    if (node.id === "on-2-mindset-attack-on-two" || title.includes("attack on two")) return "target";
    if (node.id === "hitting" || title.includes("hitting")) return "hitting";
    if (node.id === "defense" || title.includes("defense")) return "defense";
    if (node.id === "blocking" || title.includes("blocking")) return "blocking";
    if (node.id === "culture" || title.includes("culture")) return "culture";
    if (node.id === "game-like-training" || title.includes("game like")) return "cone";
    if (node.id === "plyos" || title.includes("plyos")) return "plyos";
    return "module";
  }

  function createSkillIcon(name) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 64 64");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = SKILL_ICON_PATHS[name] || SKILL_ICON_PATHS.module;
    return svg;
  }

  function getDisplayTitle(input) {
    const rawTitle = typeof input === "string" ? input : (input && input.title) || "";
    return rawTitle
      .replace(/^(.+?)\s+\d+\s*-\s*/, "$1 - ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function renderVideo(lesson) {
    if (!isLessonReady(lesson)) {
      setVideoPlaceholder(
        "Video coming soon",
        "This lesson is part of the ABVC course and will be added once published."
      );
      return;
    }

    if (lesson.provider === "youtube" && (lesson.videoId || lesson.videoUrl || lesson.youtubeUrl)) {
      setYouTubeShell(lesson);
      return;
    }

    if (lesson.videoUrl || lesson.youtubeUrl) {
      setExternalVideoShell(lesson);
      return;
    }

    setVideoPlaceholder(
      "Video coming soon",
      "This lesson is part of the ABVC course and will be added once published."
    );
  }

  function setYouTubeShell(lesson) {
    els.videoMount.replaceChildren();
    const button = document.createElement("button");
    button.id = "videoMount";
    button.type = "button";
    button.className = "video-shell video-load-button";
    button.setAttribute("aria-label", `Play ${getDisplayTitle(lesson)}`);
    const thumbnail = getYouTubeThumbnail(lesson);
    if (thumbnail) {
      button.style.backgroundImage = `url("${thumbnail}")`;
    }

    const inner = document.createElement("span");
    inner.className = "video-placeholder";
    inner.innerHTML = '<span class="play-badge" aria-hidden="true"></span><p>Play</p>';
    button.appendChild(inner);
    button.addEventListener("click", function () {
      markViewed(lesson.id);
      const iframe = document.createElement("iframe");
      iframe.src = getYouTubeEmbedUrl(lesson);
      iframe.title = getDisplayTitle(lesson);
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      const frameShell = document.createElement("div");
      frameShell.id = "videoMount";
      frameShell.className = "video-shell video-frame-shell";
      frameShell.appendChild(iframe);
      els.videoMount.replaceWith(frameShell);
      els.videoMount = frameShell;
    });

    els.videoMount.replaceWith(button);
    els.videoMount = button;
  }

  function setExternalVideoShell(lesson) {
    els.videoMount.replaceChildren();
    const link = document.createElement("a");
    link.id = "videoMount";
    link.className = "video-shell video-load-button";
    link.href = lesson.videoUrl || lesson.youtubeUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.setAttribute("aria-label", `Open ${getDisplayTitle(lesson)} video`);
    link.innerHTML = '<span class="video-placeholder"><span class="play-badge" aria-hidden="true"></span><p>Open the linked video</p></span>';
    link.addEventListener("click", function () {
      markViewed(lesson.id);
    });
    els.videoMount.replaceWith(link);
    els.videoMount = link;
  }

  function getLessonStatusLabel(lesson) {
    if (state.progress.completed.includes(lesson.id)) return "Done";
    if (isLessonReady(lesson)) return "";
    return "Coming Soon";
  }

  function getYouTubeEmbedUrl(lesson) {
    const id = lesson.videoId || getYouTubeIdFromUrl(lesson.youtubeUrl) || getYouTubeIdFromUrl(lesson.videoUrl);
    const params = new URLSearchParams({
      autoplay: "1",
      rel: "0",
      playsinline: "1",
      modestbranding: "1",
      iv_load_policy: "3",
      color: "white"
    });
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${params.toString()}`;
  }

  function getYouTubeThumbnail(lesson) {
    if (lesson.thumbnail) return lesson.thumbnail;
    const id = lesson.videoId || getYouTubeIdFromUrl(lesson.youtubeUrl) || getYouTubeIdFromUrl(lesson.videoUrl);
    return id ? `https://img.youtube.com/vi/${encodeURIComponent(id)}/hqdefault.jpg` : "";
  }

  function getYouTubeIdFromUrl(url) {
    if (!url) return "";
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./, "");
      if (host === "youtu.be") {
        return parsed.pathname.split("/").filter(Boolean)[0] || "";
      }
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      if (pathParts[0] === "shorts" || pathParts[0] === "embed") {
        return pathParts[1] || "";
      }
      const id = parsed.searchParams.get("v") || "";
      return id.length > 11 ? id.slice(0, 11) : id;
    } catch (error) {
      return "";
    }
  }

  function setVideoPlaceholder(message, note) {
    if (!els.videoMount.classList.contains("video-shell") || els.videoMount.tagName.toLowerCase() !== "div") {
      const replacement = document.createElement("div");
      replacement.id = "videoMount";
      replacement.className = "video-shell";
      els.videoMount.replaceWith(replacement);
      els.videoMount = replacement;
    }

    els.videoMount.replaceChildren();
    const placeholder = document.createElement("div");
    placeholder.className = "video-placeholder";
    placeholder.innerHTML = '<span class="play-badge" aria-hidden="true"></span>';
    const text = document.createElement("p");
    text.textContent = message;
    placeholder.appendChild(text);
    if (note) {
      const noteText = document.createElement("span");
      noteText.className = "video-note";
      noteText.textContent = note;
      placeholder.appendChild(noteText);
    }
    els.videoMount.appendChild(placeholder);
  }

  function renderTags(lesson) {
    clearTags();
    if (!lesson.tags || !lesson.tags.length) return;

    const tagList = document.createElement("div");
    tagList.className = "tag-list";
    lesson.tags.forEach(function (tag) {
      const item = document.createElement("span");
      item.className = "tag";
      item.textContent = tag;
      tagList.appendChild(item);
    });
    els.lessonDescription.after(tagList);
  }

  function clearTags() {
    const existing = document.querySelector(".tag-list");
    if (existing) existing.remove();
  }

  function setList(list, items) {
    list.replaceChildren();
    items.forEach(function (item) {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
  }

  function refreshLessonChrome(lesson) {
    const ready = isLessonReady(lesson);
    const complete = state.progress.completed.includes(lesson.id);
    if (!ready) {
      els.lessonStatus.textContent = "Coming Soon";
      els.completeButton.disabled = true;
      els.completeButton.textContent = "Coming Soon";
      els.nextButton.disabled = !getNextLesson();
      els.nextButton.textContent = "Next Lesson";
    } else {
      els.lessonStatus.textContent = complete ? "Completed" : "";
      if (complete) {
        els.completeButton.disabled = false;
        els.completeButton.textContent = "Completed";
      } else {
        els.completeButton.disabled = false;
        els.completeButton.textContent = "Mark Complete";
        startCompletionGate(lesson);
      }
      updateNextAction(lesson, complete);
    }

    const scope = getLessonScope(lesson);
    renderPlaylist({
      title: scope.title,
      lessons: scope.lessons,
      activeLessonId: lesson.id
    });
    renderSeriesCompletePanel(lesson, complete);
  }

  function updateNextAction(lesson, complete) {
    const next = getNextLesson();
    if (next) {
      els.nextButton.textContent = "Next Lesson";
      els.nextButton.disabled = !complete;
      return;
    }

    const nextSeries = getNextSeriesTarget(lesson);
    if (nextSeries && complete && isSeriesComplete(getLessonSeries(lesson))) {
      els.nextButton.textContent = "Next Series";
      els.nextButton.disabled = false;
      return;
    }

    els.nextButton.textContent = nextSeries ? "Next Series" : "Course Complete";
    els.nextButton.disabled = true;
  }

  function renderSeriesCompletePanel(lesson, complete) {
    els.seriesCompletePanel.replaceChildren();
    const series = getLessonSeries(lesson);
    const nextSeries = getNextSeriesTarget(lesson);
    if (!complete || getNextLesson() || !isSeriesComplete(series) || !nextSeries) {
      els.seriesCompletePanel.hidden = true;
      return;
    }

    els.seriesCompletePanel.hidden = false;

    const check = document.createElement("span");
    check.className = "series-check";
    check.setAttribute("aria-hidden", "true");

    const copy = document.createElement("div");
    copy.className = "series-complete-copy";

    const eyebrow = document.createElement("p");
    eyebrow.textContent = "Series complete";

    const title = document.createElement("h3");
    title.textContent = `Next series: ${getDisplayTitle(nextSeries.series)}`;

    const note = document.createElement("span");
    note.textContent = "Keep the rhythm going.";
    copy.append(eyebrow, title, note);

    const button = document.createElement("button");
    button.className = "button button-primary series-next-button";
    button.type = "button";
    button.textContent = "Next Series";
    button.addEventListener("click", function () {
      animateSeriesAdvance(nextSeries);
    });

    els.seriesCompletePanel.append(check, copy, button);
  }

  function animateSeriesAdvance(nextSeries) {
    els.seriesCompletePanel.hidden = false;
    els.seriesCompletePanel.classList.add("is-advancing");

    window.setTimeout(function () {
      els.seriesCompletePanel.classList.remove("is-advancing");
      selectNode(nextSeries.lesson.id);
    }, 720);
  }

  function startCompletionGate(lesson) {
    if (!lesson || !isLessonReady(lesson) || state.progress.completed.includes(lesson.id)) {
      clearCompletionGate();
      return;
    }

    state.completionGate.lessonId = lesson.id;
    state.completionGate.remaining = COMPLETION_GATE_SECONDS;
    state.completionGate.unlocked = true;

    state.completionGate.timerId = window.setInterval(function () {
      if (state.selectedId !== lesson.id) {
        clearCompletionGate();
        return;
      }

      state.completionGate.remaining -= 1;
      if (state.completionGate.remaining <= 0) {
        window.clearInterval(state.completionGate.timerId);
        state.completionGate.timerId = null;
        state.completionGate.remaining = 0;
        markComplete(lesson.id);
        return;
      }
    }, 1000);
  }

  function clearCompletionGate() {
    if (state.completionGate.timerId) {
      window.clearInterval(state.completionGate.timerId);
    }
    state.completionGate = {
      lessonId: null,
      timerId: null,
      remaining: COMPLETION_GATE_SECONDS,
      unlocked: false
    };
  }

  function markViewed(id) {
    pushUnique(state.progress.viewed, id);
    state.progress.lastLessonId = id;
    saveProgress();
    renderProgress();
  }

  function markComplete(id) {
    if (!state.progress.completed.includes(id)) {
      state.progress.completed.push(id);
    }
    pushUnique(state.progress.viewed, id);
    state.progress.lastLessonId = id;
    saveProgress();
    render();

    if (state.selectedId === id) {
      const lesson = state.nodesById.get(id);
      if (lesson && lesson.type === "lesson") {
        refreshLessonChrome(lesson);
      }
    }
  }

  function toggleComplete(id) {
    const completed = state.progress.completed;
    const index = completed.indexOf(id);
    if (index >= 0) {
      completed.splice(index, 1);
    } else {
      completed.push(id);
    }
    pushUnique(state.progress.viewed, id);
    state.progress.lastLessonId = id;
    saveProgress();
    selectNode(id, { skipViewedUpdate: true });
  }

  function getNextLesson() {
    if (!state.lessons.length) return null;
    if (!state.selectedId) return state.lessons.find(isLessonReady) || state.lessons[0];

    const selected = state.nodesById.get(state.selectedId);
    if (!selected) return state.lessons.find(isLessonReady) || state.lessons[0];

    if (selected.type !== "lesson") {
      const lessons = getDescendantLessons(selected);
      return lessons.find(function (lesson) {
        return isLessonReady(lesson) && !state.progress.completed.includes(lesson.id);
      }) || lessons.find(isLessonReady) || lessons[0] || null;
    }

    const scope = getLessonScope(selected);
    const currentIndex = scope.lessons.findIndex(function (lesson) {
      return lesson.id === selected.id;
    });

    if (currentIndex < 0) {
      return scope.lessons.find(isLessonReady) || scope.lessons[0] || null;
    }

    return getNextReadyLessonInList(scope.lessons, selected.id);
  }

  function getNextReadyLessonInList(lessons, currentLessonId) {
    const currentIndex = lessons.findIndex(function (lesson) {
      return lesson.id === currentLessonId;
    });
    if (currentIndex < 0) return lessons.find(isLessonReady) || null;

    for (let index = currentIndex + 1; index < lessons.length; index += 1) {
      if (isLessonReady(lessons[index])) return lessons[index];
    }

    return null;
  }

  function getLessonSeries(lesson) {
    if (!lesson || lesson.type !== "lesson") return null;
    return state.parentsById.get(lesson.id) || null;
  }

  function getSeriesList() {
    const series = [];
    (state.data.course.modules || []).forEach(function (node) {
      collectSeries(node, series);
    });
    return series;
  }

  function collectSeries(node, series) {
    if (!node || node.type === "lesson") return;
    if (getDescendantLessons(node).length && !hasSubsections(node)) {
      series.push(node);
      return;
    }
    (node.children || []).forEach(function (child) {
      collectSeries(child, series);
    });
  }

  function isSeriesComplete(series) {
    if (!series) return false;
    const readyLessons = getDescendantLessons(series).filter(isLessonReady);
    return readyLessons.length > 0 && readyLessons.every(function (lesson) {
      return state.progress.completed.includes(lesson.id);
    });
  }

  function getNextSeriesTarget(lesson) {
    const currentSeries = getLessonSeries(lesson);
    if (!currentSeries) return null;
    const series = getSeriesList();
    const index = series.findIndex(function (item) {
      return item.id === currentSeries.id;
    });
    if (index < 0) return null;

    for (let nextIndex = index + 1; nextIndex < series.length; nextIndex += 1) {
      const nextSeries = series[nextIndex];
      const nextLesson = getFirstReadyLesson(nextSeries);
      if (nextLesson) {
        return {
          series: nextSeries,
          lesson: nextLesson
        };
      }
    }

    return null;
  }

  function getFirstReadyLesson(series) {
    return getDescendantLessons(series).find(isLessonReady) || null;
  }

  function getResumeLesson() {
    if (state.progress.lastLessonId && state.nodesById.has(state.progress.lastLessonId)) {
      return state.nodesById.get(state.progress.lastLessonId);
    }

    return state.lessons.find(function (lesson) {
      return !state.progress.completed.includes(lesson.id);
    }) || state.lessons[0] || null;
  }

  function getDescendantLessons(node) {
    if (node.type === "lesson") return [node];

    return (node.children || []).flatMap(function (child) {
      return getDescendantLessons(child);
    });
  }

  function hasSubsections(node) {
    return Boolean(
      node &&
      node.type !== "lesson" &&
      (node.children || []).some(function (child) {
        return child.type !== "lesson";
      })
    );
  }

  function getRecommendedLesson(node) {
    const lessons = getDescendantLessons(node);
    const readyLessons = lessons.filter(isLessonReady);
    const nextReady = readyLessons.find(function (lesson) {
      return !state.progress.completed.includes(lesson.id);
    });

    return nextReady || readyLessons[0] || lessons[0] || null;
  }

  function getLessonScope(lesson) {
    const parent = state.parentsById.get(lesson.id);
    if (!parent) {
      return {
        title: state.data.course.title,
        lessons: state.lessons
      };
    }

    return {
      title: parent.title,
      lessons: getDescendantLessons(parent)
    };
  }

  function getAncestors(id) {
    const ancestors = [];
    let parent = state.parentsById.get(id);
    while (parent) {
      ancestors.unshift(parent);
      parent = state.parentsById.get(parent.id);
    }
    return ancestors;
  }

  function getPath(id) {
    const node = state.nodesById.get(id);
    return getAncestors(id).concat(node).map(function (item) {
      return getDisplayTitle(item);
    }).join(" / ");
  }

  function getNodeMeta(node) {
    if (node.type === "lesson") {
      return getLessonStatusLabel(node);
    }

    const lessons = getDescendantLessons(node);
    if (!lessons.length) return "Soon";

    const stats = getReadyStats(lessons);
    return `${stats.ready}/${stats.total}`;
  }

  function nodeMatchesSearch(node) {
    if (!state.search) return true;
    const haystack = [
      node.title,
      node.category,
      node.subcategory,
      node.status,
      node.description,
      node.duration,
      ...(node.tags || []),
      ...(node.notes || []),
      ...(node.drills || [])
    ].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(state.search);
  }

  function openMatchingAncestors() {
    state.nodesById.forEach(function (node) {
      if (!nodeMatchesSearch(node)) return;
      getAncestors(node.id).forEach(function (ancestor) {
        state.openIds.add(ancestor.id);
      });
    });
  }

  function pushUnique(array, value) {
    if (!array.includes(value)) {
      array.push(value);
    }
  }

  function scrollMobileContentToTop() {
    if (!isMobileLayout()) return;

    window.requestAnimationFrame(function () {
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  }

  function renderError(error) {
    els.tree.innerHTML = "";
    const message = document.createElement("p");
    message.className = "empty-note";
    message.textContent = "Course data could not be loaded.";
    els.tree.appendChild(message);

    els.lessonTitle.textContent = "Course unavailable";
    els.lessonDescription.hidden = false;
    els.lessonDescription.textContent = error.message;
    els.lessonStatus.textContent = "Error";
    setVideoPlaceholder("Check that course-data.json is next to index.html.");
  }
})();
