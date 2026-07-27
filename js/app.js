/* =========================================================
   科目一英文题库 · 模拟考试应用逻辑
   纯前端实现，无需后台，可直接部署到 GitHub Pages
   ========================================================= */
(function(){
  "use strict";

  var TOTAL_PICK   = 100;
  var PASS_SCORE   = 90;
  var DURATION_MS  = 45 * 60 * 1000; // 45 分钟
  var STORAGE_KEY  = "sub1_quiz_state_v1";
  var DARK_KEY     = "sub1_quiz_dark_v1";

  var QMAP = {};
  QUESTIONS.forEach(function(q){ QMAP[q.id] = q; });

  var appEl        = document.getElementById("app");
  var examMetaEl   = document.getElementById("examMeta");
  var timerTextEl  = document.getElementById("timerText");
  var timerChipEl  = document.getElementById("timerChip");
  var progressTextEl = document.getElementById("progressText");
  var sheetGridEl  = document.getElementById("sheetGrid");
  var sheetDrawer  = document.getElementById("sheetDrawer");
  var sheetOverlay = document.getElementById("sheetOverlay");

  var state = null;       // current exam state
  var timerHandle = null;

  /* ---------------- persistence ---------------- */
  function saveState(){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){}
  }
  function loadState(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    }catch(e){ return null; }
  }
  function clearState(){
    try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
    state = null;
  }

  /* ---------------- dark mode ---------------- */
  function applyDark(on){
    document.documentElement.classList.toggle("dark", on);
    document.getElementById("iconSun").style.display = on ? "none" : "block";
    document.getElementById("iconMoon").style.display = on ? "block" : "none";
    try{ localStorage.setItem(DARK_KEY, on ? "1" : "0"); }catch(e){}
  }
  (function initDark(){
    var pref = null;
    try{ pref = localStorage.getItem(DARK_KEY); }catch(e){}
    if(pref === null){
      pref = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "1" : "0";
    }
    applyDark(pref === "1");
  })();
  document.getElementById("darkToggle").addEventListener("click", function(){
    applyDark(!document.documentElement.classList.contains("dark"));
  });

  /* ---------------- helpers ---------------- */
  function shuffle(arr){
    var a = arr.slice();
    for(var i=a.length-1;i>0;i--){
      var j = Math.floor(Math.random()*(i+1));
      var t=a[i]; a[i]=a[j]; a[j]=t;
    }
    return a;
  }
  function pad2(n){ return n<10 ? "0"+n : ""+n; }
  function fmtTime(ms){
    if(ms<0) ms=0;
    var totalSec = Math.floor(ms/1000);
    var m = Math.floor(totalSec/60), s = totalSec%60;
    return pad2(m)+":"+pad2(s);
  }
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  /* ---------------- new exam ---------------- */
  function startNewExam(){
    var ids = shuffle(QUESTIONS.map(function(q){return q.id;})).slice(0, TOTAL_PICK);
    state = {
      ids: ids,
      answers: {},          // id -> chosen value ("Right"/"Wrong"/"A".."D")
      current: 0,
      startTime: Date.now(),
      finished: false,
      endTime: null
    };
    saveState();
    document.body.classList.add("exam-active");
    renderExam();
    startTimerLoop();
  }

  function resumeExam(){
    document.body.classList.add("exam-active");
    renderExam();
    startTimerLoop();
  }

  /* ---------------- timer ---------------- */
  function startTimerLoop(){
    stopTimerLoop();
    tickTimer();
    timerHandle = setInterval(tickTimer, 1000);
  }
  function stopTimerLoop(){
    if(timerHandle){ clearInterval(timerHandle); timerHandle=null; }
  }
  function tickTimer(){
    if(!state || state.finished){ stopTimerLoop(); return; }
    var remaining = DURATION_MS - (Date.now() - state.startTime);
    if(remaining <= 0){
      timerTextEl.textContent = "00:00";
      finishExam(true);
      return;
    }
    timerTextEl.textContent = fmtTime(remaining);
    timerChipEl.classList.toggle("low", remaining < 5*60*1000);
  }

  /* ---------------- exam UI ---------------- */
  function answeredCount(){
    var c=0;
    state.ids.forEach(function(id){ if(state.answers[id]!==undefined) c++; });
    return c;
  }

  function renderExam(){
    examMetaEl.classList.remove("hidden");
    progressTextEl.textContent = answeredCount() + " / " + TOTAL_PICK;

    var idx = state.current;
    var qid = state.ids[idx];
    var q = QMAP[qid];
    var chosen = state.answers[qid];

    var pct = Math.round(((idx)/TOTAL_PICK)*100);

    var html = '';
    html += '<div class="road-progress">'
          +   '<div class="fill" style="width:'+pct+'%"></div>'
          +   '<div class="dashes"></div>'
          +   '<div class="car" style="left:'+pct+'%">🚗</div>'
          + '</div>';

    html += '<div class="q-card">';
    html += '<div class="q-top">'
          +   '<span class="q-index">第 '+(idx+1)+' / '+TOTAL_PICK+' 题</span>'
          +   '<span class="q-type-tag">'+(q.type==='tf' ? '判断题' : '单选题')+'</span>'
          + '</div>';
    html += '<p class="q-stem">'+escapeHtml(q.stem)+'</p>';
    if(q.image){
      html += '<div class="q-image-wrap"><img src="images/'+q.image+'" alt="题目配图" loading="lazy"></div>';
    }

    html += '<div class="options">';
    if(q.type === 'tf'){
      ['Right','Wrong'].forEach(function(val){
        var sel = chosen === val ? ' selected' : '';
        var label = val === 'Right' ? 'Right（正确）' : 'Wrong（错误）';
        html += '<button type="button" class="opt tf'+sel+'" data-val="'+val+'">'
              +   '<span class="opt-key">'+(val==='Right'?'✓':'✕')+'</span>'
              +   '<span>'+label+'</span>'
              + '</button>';
      });
    } else {
      ['A','B','C','D'].forEach(function(letter){
        if(!q.options[letter]) return;
        var sel = chosen === letter ? ' selected' : '';
        html += '<button type="button" class="opt'+sel+'" data-val="'+letter+'">'
              +   '<span class="opt-key">'+letter+'</span>'
              +   '<span>'+escapeHtml(q.options[letter])+'</span>'
              + '</button>';
      });
    }
    html += '</div>'; // options

    html += '<div class="q-nav">'
          +   '<button class="btn btn-outline" id="prevBtn" '+(idx===0?'disabled':'')+'>← 上一题</button>'
          +   '<span class="spacer"></span>'
          +   (idx === TOTAL_PICK-1
                ? '<button class="btn btn-primary" id="submitBtn">交卷</button>'
                : '<button class="btn btn-primary" id="nextBtn">下一题 →</button>')
          + '</div>';
    html += '</div>'; // q-card

    appEl.innerHTML = html;

    // bind option clicks
    Array.prototype.forEach.call(appEl.querySelectorAll('.opt'), function(btn){
      btn.addEventListener('click', function(){
        state.answers[qid] = btn.getAttribute('data-val');
        saveState();
        renderExam();
      });
    });
    var prevBtn = document.getElementById('prevBtn');
    if(prevBtn) prevBtn.addEventListener('click', function(){ goTo(idx-1); });
    var nextBtn = document.getElementById('nextBtn');
    if(nextBtn) nextBtn.addEventListener('click', function(){ goTo(idx+1); });
    var submitBtn = document.getElementById('submitBtn');
    if(submitBtn) submitBtn.addEventListener('click', function(){ confirmSubmit(); });

    renderSheet();
  }

  function goTo(i){
    if(i<0||i>=TOTAL_PICK) return;
    state.current = i;
    saveState();
    renderExam();
    closeSheet();
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function renderSheet(){
    var html = '';
    state.ids.forEach(function(id, i){
      var cls = 'sheet-cell';
      if(state.answers[id]!==undefined) cls += ' answered';
      if(i===state.current) cls += ' current';
      html += '<div class="'+cls+'" data-i="'+i+'">'+(i+1)+'</div>';
    });
    sheetGridEl.innerHTML = html;
    Array.prototype.forEach.call(sheetGridEl.querySelectorAll('.sheet-cell'), function(cell){
      cell.addEventListener('click', function(){
        goTo(parseInt(cell.getAttribute('data-i'),10));
      });
    });
  }

  /* ---------------- sheet drawer (mobile) ---------------- */
  function openSheet(){ sheetDrawer.classList.add('open'); sheetOverlay.classList.add('show'); }
  function closeSheet(){
    if(window.innerWidth < 960){
      sheetDrawer.classList.remove('open'); sheetOverlay.classList.remove('show');
    }
  }
  document.getElementById('sheetToggleBtn').addEventListener('click', openSheet);
  document.getElementById('sheetCloseBtn').addEventListener('click', closeSheet);
  sheetOverlay.addEventListener('click', closeSheet);
  document.getElementById('submitFromSheetBtn').addEventListener('click', function(){
    if(state && !state.finished) confirmSubmit();
  });

  /* ---------------- submit / finish ---------------- */
  function confirmSubmit(){
    var remain = TOTAL_PICK - answeredCount();
    var msg = remain > 0
      ? ('还有 '+remain+' 道题未作答，确定要交卷吗？')
      : '确定要交卷吗？';
    if(window.confirm(msg)){
      finishExam(false);
    }
  }

  function finishExam(auto){
    stopTimerLoop();
    state.finished = true;
    state.endTime = Date.now();
    saveState();
    document.body.classList.remove('exam-active');
    closeSheet();
    renderResults(auto);
  }

  function scoreState(){
    var correct=0, wrong=0, blank=0;
    var detail = state.ids.map(function(id){
      var q = QMAP[id];
      var chosen = state.answers[id];
      var isCorrect = chosen !== undefined && chosen === q.answer;
      if(chosen === undefined) blank++;
      else if(isCorrect) correct++;
      else wrong++;
      return {q:q, chosen:chosen, isCorrect:isCorrect};
    });
    return {correct:correct, wrong:wrong, blank:blank, score:correct, detail:detail};
  }

  /* ---------------- results screen ---------------- */
  var reviewFilter = 'wrong'; // 'wrong' | 'all'

  function renderResults(auto){
    examMetaEl.classList.add('hidden');
    var r = scoreState();
    var pass = r.score >= PASS_SCORE;
    var usedMs = (state.endTime - state.startTime);

    var html = '';
    html += '<div class="result-hero">';
    html +=   (auto ? '<div class="result-sub">时间到，系统已自动交卷</div>' : '');
    html +=   '<div class="result-sub" style="margin-top:2px;">最终得分</div>';
    html +=   '<div class="result-score">'+r.score+'<span style="font-size:28px;color:#B7BDC2;"> / 100</span></div>';
    html +=   '<span class="result-badge '+(pass?'pass':'fail')+'">'+(pass?'PASS 合格':'FAIL 未合格')+'</span>';
    html +=   '<div class="result-stats">'
            +   '<div class="stat"><b>'+r.correct+'</b><span>答对</span></div>'
            +   '<div class="stat"><b>'+r.wrong+'</b><span>答错</span></div>'
            +   '<div class="stat"><b>'+r.blank+'</b><span>未作答</span></div>'
            +   '<div class="stat"><b>'+fmtTime(usedMs)+'</b><span>用时</span></div>'
            + '</div>';
    html +=   '<div class="result-actions">'
            +   '<button class="btn btn-accent" id="retestBtn">再来一次（新的100题）</button>'
            +   '<button class="btn btn-ghost" id="reviewAllBtn" style="border-color:rgba(255,255,255,.3);color:#F4F1E8;">查看全部题目</button>'
            + '</div>';
    html += '</div>'; // result-hero

    html += '<div class="review-toolbar">'
          +   '<strong style="margin-right:6px;">错题回顾</strong>'
          +   '<button class="btn '+(reviewFilter==='wrong'?'active':'')+'" id="filterWrong">只看错题/未答 ('+(r.wrong+r.blank)+')</button>'
          +   '<button class="btn '+(reviewFilter==='all'?'active':'')+'" id="filterAll">查看全部 ('+TOTAL_PICK+')</button>'
          + '</div>';

    var list = r.detail.filter(function(d){
      return reviewFilter === 'all' ? true : !d.isCorrect;
    });

    if(list.length === 0){
      html += '<div class="center-empty">🎉 全部答对，没有错题！</div>';
    } else {
      list.forEach(function(d){
        var q = d.q;
        var tagClass = d.chosen===undefined ? 'blank' : (d.isCorrect ? 'correct' : 'wrong');
        var tagText  = d.chosen===undefined ? '未作答' : (d.isCorrect ? '回答正确' : '回答错误');
        html += '<div class="review-item">';
        html +=   '<span class="tag '+tagClass+'">'+tagText+'</span>';
        html +=   '<p class="q-stem" style="font-size:15.5px;">'+escapeHtml(q.stem)+'</p>';
        if(q.image){
          html += '<div class="q-image-wrap"><img src="images/'+q.image+'" alt="题目配图" loading="lazy"></div>';
        }
        if(q.type === 'choice'){
          html += '<div class="options">';
          ['A','B','C','D'].forEach(function(letter){
            if(!q.options[letter]) return;
            var cls = 'opt locked';
            if(letter === q.answer) cls += ' correct-answer';
            else if(letter === d.chosen) cls += ' wrong-answer';
            html += '<div class="'+cls+'"><span class="opt-key">'+letter+'</span><span>'+escapeHtml(q.options[letter])+'</span></div>';
          });
          html += '</div>';
        } else {
          html += '<div class="review-answers">'
                +   '<span><b>正确答案：</b><span class="correct-ans">'+q.answer+'</span></span>'
                +   (d.chosen!==undefined ? '<span><b>你的答案：</b><span class="'+(d.isCorrect?'correct-ans':'your-ans')+'">'+d.chosen+'</span></span>' : '')
                + '</div>';
        }
        if(q.type==='choice'){
          html += '<div class="review-answers">'
                +   '<span><b>正确答案：</b><span class="correct-ans">'+q.answer+'</span></span>'
                +   (d.chosen!==undefined ? '<span><b>你的答案：</b><span class="'+(d.isCorrect?'correct-ans':'your-ans')+'">'+d.chosen+'</span></span>' : '<span><b>你的答案：</b>未作答</span>')
                + '</div>';
        }
        html += '</div>'; // review-item
      });
    }

    html += '<div class="footer-note">共 '+QUESTIONS.length+' 题库随机抽取 '+TOTAL_PICK+' 题 · 90 分合格 · 数据仅保存在本地浏览器</div>';

    appEl.innerHTML = html;

    document.getElementById('retestBtn').addEventListener('click', function(){
      clearState();
      startNewExam();
    });
    document.getElementById('reviewAllBtn').addEventListener('click', function(){
      reviewFilter = 'all'; renderResults(auto);
      document.querySelector('.review-toolbar').scrollIntoView({behavior:'smooth'});
    });
    document.getElementById('filterWrong').addEventListener('click', function(){ reviewFilter='wrong'; renderResults(auto); });
    document.getElementById('filterAll').addEventListener('click', function(){ reviewFilter='all'; renderResults(auto); });
  }

  /* ---------------- start screen ---------------- */
  function renderStart(resumable){
    document.body.classList.remove('exam-active');
    examMetaEl.classList.add('hidden');

    var html = '';

    if(resumable){
      var remaining = DURATION_MS - (Date.now() - resumable.startTime);
      if(remaining > 0){
        html += '<div class="resume-banner">'
              +   '<span>检测到未完成的测试，已作答 '+Object.keys(resumable.answers).length+' / '+TOTAL_PICK+' 题，剩余时间 '+fmtTime(remaining)+'</span>'
              +   '<button class="btn btn-primary" id="resumeBtn">继续测试</button>'
              + '</div>';
      }
    }

    html += '<div class="hero">';
    html +=   '<h1>科目一英文版 · 模拟考试</h1>';
    html +=   '<p class="lead">题库源自科目一英文题库 PDF，共 '+QUESTIONS.length+' 道题目（含判断题与图文单选题）。每次测试从题库中随机抽取 100 题，限时 45 分钟，满分 100 分，90 分及以上为合格。</p>';

    html +=   '<div class="stat-row">'
            +   '<div class="stat-card"><div class="num">'+QUESTIONS.length+'</div><div class="lbl">题库总题数</div></div>'
            +   '<div class="stat-card"><div class="num">100</div><div class="lbl">每次抽取题数</div></div>'
            +   '<div class="stat-card"><div class="num">45</div><div class="lbl">考试时长（分钟）</div></div>'
            +   '<div class="stat-card"><div class="num">90</div><div class="lbl">合格分数线</div></div>'
            + '</div>';

    html +=   '<ul class="rule-list">'
            +   '<li>每题 1 分，满分 100 分，90 分及以上视为 PASS</li>'
            +   '<li>倒计时 45 分钟，时间到自动交卷</li>'
            +   '<li>作答进度自动保存在本机浏览器，刷新页面不会丢失</li>'
            +   '<li>右侧（移动端为“答题卡”按钮）可快速跳转到任意题目</li>'
            +   '<li>交卷后可查看错题回顾及正确答案</li>'
            +   '<li>支持深色模式，适配电脑 / 平板 / 手机</li>'
            + '</ul>';

    html +=   '<button class="btn btn-primary" id="startBtn" style="font-size:16px; padding:14px 28px;">开始测试 →</button>';
    html += '</div>';

    appEl.innerHTML = html;

    document.getElementById('startBtn').addEventListener('click', function(){
      clearState();
      startNewExam();
    });
    var resumeBtn = document.getElementById('resumeBtn');
    if(resumeBtn) resumeBtn.addEventListener('click', function(){
      state = resumable;
      resumeExam();
    });
  }

  /* ---------------- boot ---------------- */
  function boot(){
    var saved = loadState();
    if(saved && !saved.finished){
      var remaining = DURATION_MS - (Date.now() - saved.startTime);
      if(remaining <= 0){
        // time already expired while away — auto finish
        state = saved;
        state.finished = true;
        state.endTime = saved.startTime + DURATION_MS;
        saveState();
        renderResults(true);
      } else {
        renderStart(saved);
      }
    } else if(saved && saved.finished){
      state = saved;
      renderResults(false);
    } else {
      renderStart(null);
    }
  }

  boot();
})();
