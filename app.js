(function () {
  const STORAGE_KEY = "abvcCourseProgress.v1";
  const THEME_KEY = "abvcCourseTheme.v1";
  const EMAIL_POPUP_KEY = "abvcEmailPopupShown.v2";
  const COMPLETION_GATE_SECONDS = 15;
  const MAILCHIMP_POPUP_SRC = "https://chimpstatic.com/mcjs-connected/js/users/8a5a40781b8eb0233e2a99b61/4158b259b9c6bb504e699e1d3.js";

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
      loadEmailPopupOnce();
    } catch (error) {
      renderError(error);
    }
  }

  function loadEmailPopupOnce() {
    if (hasSeenEmailPopup()) return;
    if (document.getElementById("mcjs")) return;

    window.setTimeout(function () {
      const script = document.createElement("script");
      script.id = "mcjs";
      script.async = true;
      script.src = MAILCHIMP_POPUP_SRC;
      script.addEventListener("load", markEmailPopupSeen);
      document.head.appendChild(script);
    }, 1200);
  }

  function hasSeenEmailPopup() {
    try {
      return window.localStorage.getItem(EMAIL_POPUP_KEY) === "true";
    } catch (error) {
      return false;
    }
  }

  function markEmailPopupSeen() {
    try {
      window.localStorage.setItem(EMAIL_POPUP_KEY, "true");
    } catch (error) {
      return;
    }
  }

  function bindEvents() {
    els.mobileMenuButton.setAttribute("aria-expanded", "false");

    els.brandHomeButton.addEventListener("click", function () {
      goHome();
    });

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
    row.title = node.title;
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
    title.textContent = node.title;
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

  function goHome() {
    clearCompletionGate();
    state.search = "";
    els.search.value = "";
    renderOverview();
    render();
    closeMobileSidebarAfterNavigation();
    scrollMobileContentToTop();
  }

  function goBack() {
    const selected = state.selectedId ? state.nodesById.get(state.selectedId) : null;
    if (!selected) {
      renderOverview();
      render();
      return;
    }

    const parent = state.parentsById.get(selected.id);
    if (parent) {
      selectNode(parent.id, { skipViewedUpdate: true });
      return;
    }

    renderOverview();
    render();
  }

  function selectInitialContent() {
    renderOverview();
    render();
  }

  function selectNode(id, options) {
    const node = state.nodesById.get(id);
    if (!node) return;

    clearCompletionGate();
    state.selectedId = id;
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

  function renderOverview() {
    const stats = getReadyStats(state.lessons);
    clearTags();
    state.selectedId = null;
    setContentMode("hub");
    updateBackButton();
    hideLessonDescription();
    hidePlaylist();
    els.lessonPath.textContent = "American Beach Volleyball Club";
    els.lessonTitle.textContent = state.data.course.title;
    els.lessonStatus.textContent = `${stats.ready}/${stats.total} videos`;
    renderSkillHub({
      title: "Choose Your Skill",
      nodes: state.data.course.modules || [],
      showResume: true
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
    els.lessonTitle.textContent = module.title;
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
    els.lessonTitle.textContent = lesson.title;

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

    const parent = state.parentsById.get(selected.id);
    els.backButton.textContent = "←";
    els.backButton.setAttribute("aria-label", parent ? `Back to ${parent.title}` : "Back to Skills");
    els.backButton.title = parent ? `Back to ${parent.title}` : "Back to Skills";
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
    title.textContent = options.title;
    copy.append(eyebrow, title);

    const count = document.createElement("span");
    count.className = "playlist-count";
    count.textContent = `${completed}/${readyLessons.length} complete`;

    const toggle = document.createElement("button");
    toggle.className = "playlist-toggle";
    toggle.type = "button";
    toggle.textContent = "Hide";
    toggle.setAttribute("aria-expanded", "true");
    toggle.addEventListener("click", function () {
      const collapsed = !els.coursePlaylist.classList.contains("is-collapsed");
      els.coursePlaylist.classList.toggle("is-collapsed", collapsed);
      toggle.textContent = collapsed ? "Show" : "Hide";
      toggle.setAttribute("aria-expanded", String(!collapsed));
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
    title.textContent = options.title;
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
    upNextButton.textContent = nextLesson ? nextLesson.title : "Review this module";
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

    els.mobileLessonProgress.append(label, track);
  }

  function createPlaylistRow(lesson, index, activeLessonId) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "playlist-row";
    row.title = lesson.title;
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
    title.textContent = lesson.title;

    const status = document.createElement("span");
    status.className = "playlist-row-status";
    status.textContent = getLessonStatusLabel(lesson);

    row.append(number, title, status);
    return row;
  }

  function renderSkillHub(options) {
    els.skillHub.replaceChildren();

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
        resumeButton.textContent = `Resume ${resume.title}`;
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
        grid.appendChild(createSkillCard(node));
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

  function createSkillCard(node) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "skill-card";
    card.dataset.nodeType = node.type;
    card.addEventListener("click", function () {
      if (node.type !== "lesson") {
        state.openIds.add(node.id);
      }
      enterCourseNode(node);
    });

    const icon = document.createElement("span");
    icon.className = "skill-card-icon";
    icon.dataset.icon = node.type === "lesson" ? "lesson" : "module";
    icon.setAttribute("aria-hidden", "true");

    const title = document.createElement("strong");
    title.className = "skill-card-title";
    title.textContent = node.title;

    const footer = document.createElement("span");
    footer.className = "skill-card-footer";

    const meta = document.createElement("span");
    meta.textContent = getSkillCardMeta(node);

    const action = document.createElement("span");
    action.className = "skill-card-action";
    action.textContent = getSkillCardAction(node);

    footer.append(meta, action);
    card.append(icon, title, footer);
    return card;
  }

  function getSkillCardMeta(node) {
    if (node.type === "lesson") {
      return isLessonReady(node) ? "" : "Coming Soon";
    }

    if (hasSubsections(node)) {
      const sections = (node.children || []).filter(function (child) {
        return child.type !== "lesson";
      }).length;
      return `${sections} section${sections === 1 ? "" : "s"}`;
    }

    const lessons = getDescendantLessons(node);
    const stats = getReadyStats(lessons);
    return `${stats.ready}/${stats.total} videos`;
  }

  function getSkillCardAction(node) {
    if (node.type === "lesson") {
      if (!isLessonReady(node)) return "Soon";
      return state.progress.completed.includes(node.id) ? "Review" : "Watch";
    }

    if (hasSubsections(node)) return "Open";

    const readyLessons = getDescendantLessons(node).filter(isLessonReady);
    const completed = readyLessons.filter(function (lesson) {
      return state.progress.completed.includes(lesson.id);
    }).length;
    if (readyLessons.length === 0) return "Preview";
    if (completed === 0) return "Start";
    if (completed < readyLessons.length) return "Continue";
    return "Review";
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
    button.setAttribute("aria-label", `Play ${lesson.title}`);
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
      iframe.title = lesson.title;
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
    link.setAttribute("aria-label", `Open ${lesson.title} video`);
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
    title.textContent = `Next series: ${nextSeries.series.title}`;

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
      return item.title;
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
