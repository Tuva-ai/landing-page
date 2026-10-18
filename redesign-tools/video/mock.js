// Fake window.tuva bridge for recording a demo of the real Tuva desktop renderer (0.1.15).
// Project: soy-drought-k27 (soybean root H3K27me3 under drought and rewatering).
(function () {
  const ROOT = '/Users/aryan/research/soy-drought-k27';
  const PID = 'proj-soy';
  const now = Date.now();
  const iso = (daysAgo, h = 10) => new Date(now - daysAgo * 864e5 - (24 - h) * 36e5).toISOString();
  const later = (v, ms = 40) => new Promise((r) => setTimeout(() => r(v), ms));
  const subs = {};
  const sub = (name) => (cb) => {
    (subs[name] = subs[name] || []).push(cb);
    return () => { subs[name] = subs[name].filter((f) => f !== cb); };
  };
  const emit = (name, v) => (subs[name] || []).forEach((cb) => { try { cb(v); } catch (e) { console.error(e); } });
  const demo = (window.__demo = window.__demo || {});
  demo.emit = emit;

  try { localStorage.setItem(`tuva.projectSetup.v1.${PID}`, JSON.stringify({ done: true, completedAt: iso(80) })); } catch (e) {}

  // ---------- Connectors ----------
  const PROVIDERS = [
    { id: 'notion', name: 'Notion', item_noun: 'page', list_noun: 'pages', picker_hint: '', connector_id: 'notion', supports_search: true, supports_children: true },
    { id: 'google-docs', name: 'Google Docs', item_noun: 'doc', list_noun: 'docs', picker_hint: '', connector_id: 'google-docs', supports_search: true, supports_children: false },
    { id: 'google-sheets', name: 'Google Sheets', item_noun: 'sheet', list_noun: 'sheets', picker_hint: '', connector_id: 'google-sheets', supports_search: true, supports_children: false },
    { id: 'github', name: 'GitHub', item_noun: 'repository', list_noun: 'repositories', picker_hint: '', connector_id: 'github', supports_search: true, supports_children: false },
  ];
  const item = (id, title, location, days, kind, url) => ({ item_id: id, title, url: url || null, location, last_edited_at: iso(days), kind, syncable: true });
  const ITEMS = {
    notion: [
      item('n1', 'Lab meeting notes', 'Soybean Epigenetics Lab', 1, 'page'), item('n2', 'CUT&Tag protocol v4', 'Soybean Epigenetics Lab', 9, 'page'),
      item('n3', 'Antibody inventory', 'Soybean Epigenetics Lab', 4, 'page'), item('n4', 'Project plan: drought memory', 'Soybean Epigenetics Lab', 6, 'page'),
      item('n5', 'Growth chamber SOP', 'Soybean Epigenetics Lab', 30, 'page'), item('n6', 'Sequencing core submissions', 'Soybean Epigenetics Lab', 12, 'page'),
      item('n7', 'Reading group: plant chromatin', 'Soybean Epigenetics Lab', 3, 'page'), item('n8', 'Committee meeting prep', 'Private', 15, 'page'),
    ],
    'google-docs': [
      item('d1', 'Manuscript draft: K27 drought memory', 'My Drive / soy-drought-k27', 1, 'document'),
      item('d2', 'Methods: CUT&Tag in soybean roots', 'My Drive / soy-drought-k27', 8, 'document'),
      item('d3', 'Fall committee update', 'My Drive', 14, 'document'),
    ],
    'google-sheets': [
      item('s1', 'Sample sheet: drought time course', 'My Drive / soy-drought-k27', 2, 'spreadsheet'),
      item('s2', 'Library QC & sequencing runs', 'Shared with me', 1, 'spreadsheet'),
      item('s3', 'Growth chamber log', 'Shared with me', 0, 'spreadsheet'),
    ],
    github: [
      item('g1', 'soylab/soy-epigenomics-pipeline', 'soylab', 1, 'repository', 'https://github.com/soylab/soy-epigenomics-pipeline'),
      item('g3', 'aryan/soy-drought-k27', 'aryan', 0, 'repository', 'https://github.com/aryan/soy-drought-k27'),
    ],
  };
  const synced = { notion: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'], 'google-docs': ['d1', 'd2', 'd3'], 'google-sheets': ['s1', 's2', 's3'], github: ['g1', 'g3'] };
  const syncedList = (p) => ({
    state: 'ok',
    items: synced[p].map((id) => {
      const it = ITEMS[p].find((x) => x.item_id === id);
      return { item_id: id, member_id: `m-${id}`, title: it.title, url: it.url, location: it.location, last_edited_at: it.last_edited_at, cache_path: `${ROOT}/.tuva/cache/${id}.md`, last_synced_at: iso(0, 9), last_error: null };
    }),
  });

  // ---------- Sources (Knowledge base) ----------
  const remoteUrl = (p, id) => `https://${p === 'github' ? 'github.com' : p === 'notion' ? 'notion.so/soylab' : 'docs.google.com'}/${id}`;
  const remoteEntries = () => {
    const out = [];
    for (const p of ['notion', 'google-docs', 'google-sheets', 'github']) {
      for (const id of synced[p]) {
        const it = ITEMS[p].find((x) => x.item_id === id);
        const days = Math.max(1, Math.round((now - Date.parse(it.last_edited_at)) / 864e5));
        out.push({ memberId: `m-${id}`, kind: 'remote', label: it.title, path: `${ROOT}/.tuva/cache/${id}.md`, detail: `${PROVIDERS.find((x) => x.id === p).name} ${it.kind} · edited ${days}d ago`, state: 'indexed', removable: true, indexName: null, provider: p, externalUrl: it.url || remoteUrl(p, id) });
      }
    }
    return out;
  };
  const ROOT_ENTRY = { memberId: 'm-root', kind: 'root', label: 'soy-drought-k27', path: ROOT, detail: '', state: 'present', removable: false, indexName: null, provider: null, externalUrl: null };

  const FILES = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const f = (path, lo = 2, hi = 40) => FILES.push({ path, chunks: Math.round(lo + rnd() * (hi - lo)), ext: path.slice(path.lastIndexOf('.')) });
  ['01_fastp_qc.sh', '02_bowtie2_align.sh', '03_seacr_peaks.py', '04_spikein_scale.py', '05_diffbind_k27.R', '06_deseq2_rnaseq.R', '07_integrate_k27_expr.py', 'plot_metagene.py', 'plot_browser_tracks.py', 'plot_volcano.R', 'frip_scores.py', 'make_bigwigs.sh', 'merge_replicates.py', 'gene_body_coverage.py', 'utils/gff.py', 'utils/bed.py', 'utils/io.py', 'bivalent_calls.py', 'go_enrichment.R', 'export_tables.py', 'fetch_wm82_a4.sh', 'rewater_contrast.R', 'peak_overlap.py', 'qc_report.py'].forEach((x) => f(`scripts/${x}`, 2, 14));
  ['01_library_qc.ipynb', '02_peak_thresholds.ipynb', '03_k27_drought_d3_d7.ipynb', '04_rewatering_recovery.ipynb', '05_rnaseq_integration.ipynb', '06_bivalent_promoters.ipynb', '07_nac_family_tracks.ipynb', '08_go_enrichment.ipynb', '09_k4_k27_ratio.ipynb', '10_te_proximity.ipynb', '11_peak_width_drought.ipynb', '12_nac_promoter_motifs.ipynb', '13_rewater_d14_qc.ipynb', '14_fig3_panels.ipynb', '15_fig4_memory_model.ipynb', 'scratch_spikein_norm.ipynb', 'scratch_frip_by_lot.ipynb', 'scratch_seacr_vs_macs2.ipynb', 'scratch_bigwig_scaling.ipynb', 'scratch_dreb_tracks.ipynb', 'scratch_replicate_corr.ipynb', 'old/03_k27_drought_v1.ipynb', 'old/02_peak_thresholds_v1.ipynb', 'old/explore_wm82_a4.ipynb'].forEach((x) => f(`notebooks/${x}`, 8, 60));
  ['kaya-okur_2019_cut-and-tag.pdf', 'schmutz_2010_soybean-genome.pdf', 'ding_2012_drought-memory-h3k4me3.pdf', 'zhang_2007_h3k27me3-arabidopsis.pdf', 'meers_2019_seacr.pdf', 'avramova_2015_transcriptional-memory.pdf', 'lamke_2017_stress-memory-review.pdf', 'xiao_2017_prc2-plants.pdf', 'liu_2014_drought-memory-genes.pdf', 'sani_2013_hyperosmotic-priming.pdf', 'kim_2008_stress-memory.pdf', 'ramirez-prado_2019_histone-marks-stress.pdf', 'henikoff_2020_cuttag-low-input.pdf', 'liu_2018_nac-drought.pdf', 'hussain_2021_soy-nac-review.pdf', 'mozgova_2015_prc2-stress.pdf', 'crisp_2016_stress-memory.pdf', 'virlouvet_2018_dehydration-memory.pdf'].forEach((x) => f(`papers/${x}`, 20, 90));
  ['todo.md', 'decisions.md', 'cuttag_troubleshooting.md', 'antibody_lots.md', 'committee_feedback.md', 'ideas.md', 'lab_meeting_2026-09-23.md', 'lab_meeting_2026-10-07.md'].forEach((x) => f(`notes/${x}`, 1, 8));
  ['fig3_draft.md', 'abstract_v3.md', 'methods_notes.md', 'intro_v2.md', 'results_k27_section.md', 'refs.bib'].forEach((x) => f(`writing/${x}`, 2, 14));
  ['config.yaml', 'samples.tsv', 'antibodies.yaml', 'genome.yaml'].forEach((x) => f(`config/${x}`, 1, 3));
  ['Snakefile', 'rules/trim.smk', 'rules/align.smk', 'rules/peaks_seacr.smk', 'rules/spikein.smk', 'rules/diffbind.smk'].forEach((x) => f(`workflow/${x}`, 1, 5));
  ['README.md', 'CLAUDE.md', 'environment.yml', 'Makefile'].forEach((x) => f(x, 1, 4));
  const samples = [];
  for (const t of ['CTRL', 'D3', 'D7', 'RW7', 'RW14']) for (const r of [1, 2, 3]) for (const m of ['K27', 'K4', 'IgG']) samples.push(`${t}-R${r}_${m}`);
  for (const sm of samples) {
    f(`results/qc/fastp/${sm}.fastp.json`, 1, 3); f(`results/qc/frip/${sm}.frip.tsv`, 1, 2);
    f(`results/peaks/seacr/${sm}.stringent.tsv`, 1, 4); f(`results/spikein/${sm}.ecoli_counts.tsv`, 1, 2);
    f(`logs/align/${sm}.log`, 1, 2); f(`logs/seacr/${sm}.log`, 1, 2);
  }
  let k = 0;
  while (FILES.length < 1284) { f(`results/qc/multiqc/run${String(1 + Math.floor(k / samples.length)).padStart(2, '0')}/${samples[k % samples.length]}_multiqc_data.txt`, 1, 2); k++; }

  // ---------- Memory ----------
  const stateText = () => {
    const done = !!demo.runDone;
    const threads = [
      done ? null : '- Does H3K27me3 loss at GmNAC11, GmDREB2A and GmRD22 persist after rewatering? — [↳ resume](tuva:conversation:c4)',
      '- How much of the day-7 drop is antibody lot B rather than biology? — [↳ resume](tuva:conversation:c1)',
      '- Are bivalent (K4 + K27) promoters the ones that recover fastest after rewatering?',
      done ? '- Why do 3 NAC genes recover while the other 6 stay repressed? Check for PRC2 recruitment motifs.' : null,
    ].filter(Boolean).join('\n');
    const results = [
      done ? '- **New today:** after rewatering, H3K27me3 stays low at 6 of 9 NAC genes (GmNAC11 at 0.42 of control) while DREB genes recover by day 14, matching Okafor et al. 2026.' : null,
      '- H3K27me3 drops at 214 genes by day 7 (DiffBind, FDR < 0.05); 61% of them are up-regulated in RNA-seq at the same time point.',
      '- Loss is strongest at NAC and DREB transcription factors; GO terms enrich for response to water deprivation (p = 3e-9).',
      '- Spike-in scaling shrinks the GmNAC11 day-7 loss from 61% to 38%, still larger than day 3 (24%).',
    ].filter(Boolean).join('\n');
    const recent = [
      demo.ccDone ? '- **Claude Code, just now:** Fig 3b redrawn with a rewatering panel; persistent NAC genes highlighted.' : null,
      done ? '- **Rao agent, today:** rewatering recovery analysis across control, drought day 7 and rewatered day 14; figure and table saved.' : null,
      '- **Claude Code, yesterday:** spike-in scaling in scratch_spikein_norm.ipynb recovers 80% of the lot-B gap at GmNAC11.',
      '- **Codex, Oct 7:** 05_diffbind_k27.R now takes a scaling-factor table; the shared pipeline change is open as PR #42.',
      '- **Google Sheets, Oct 13:** rewatered day-14 libraries logged as sequenced, FRiP 0.35 to 0.44.',
      '- **Notion, Oct 7:** lab meeting moved the committee update to Oct 22.',
    ].filter(Boolean).join('\n');
    return `A soybean (Williams 82) root CUT&Tag study of H3K27me3 and H3K4me3 across a drought and rewatering time course, integrated with RNA-seq. The question: does drought-induced loss of H3K27me3 at stress genes persist after rewatering as a chromatin memory? Committee update Oct 22.

**Open threads**
${threads}

**Key results**
${results}

**Decisions**
- Stringent SEACR peaks with IgG control, not MACS2 broad (Aug 26 lab meeting).
- Antibody lot B retired; D7-R2 and D7-R3 to be rerun with lot C (Sep 16 lab meeting).
- Spike-in normalization for every contrast that includes lot-B libraries.

**Recent work**
${recent}

**Next steps**
- Merge PR #42 and rerun DiffBind with spike-in factors.
- Update Fig 3 and Results 3.2 before the Oct 22 committee update.`;
  };
  const DIGESTS = [
    ['Rewatered day-14 libraries logged as sequenced in the QC sheet. Spike-in scaling tested on the day-7 libraries (Claude Code).', 1],
    ['Lab meeting moved the committee update to Oct 22. Codex refactored the DiffBind script to accept spike-in factors; PR #42 opened.', 3],
    ['Results 3.2 drafted in the manuscript doc around the day-7 K27 loss.', 4],
    ['RNA-seq integration: 61% of K27-loss genes are up-regulated at day 7.', 7],
  ].map(([d, a]) => ({ digest: d, period_start: iso(a), period_end: iso(a - 1), created_at: iso(a - 1) }));

  // ---------- Digest ----------
  const DIGEST_ITEMS = [
    {
      id: 'dg1', kind: 'paper', status: 'unread',
      title: 'Drought-induced H3K27me3 loss primes stress-memory genes in soybean roots',
      authors: ['M. Okafor', 'L. Chen', 'R. Patel', 'S. Avila'], venue: 'The Plant Cell', url: 'https://example.org/paper', doi: null, published_at: iso(2),
      summary: 'Tracks H3K27me3 through two drought cycles in soybean roots and finds that loss persists after rewatering at a subset of NAC transcription factors, which respond faster to a second drought.',
      why_this: 'You are asking whether K27 loss at GmNAC11 persists after rewatering. This study follows the same mark through two drought cycles and finds the loss persists at a subset of NAC genes, the comparison your new rewatered day-14 libraries can now answer.',
      thread_title: 'Does H3K27me3 loss at stress genes persist after rewatering?', score: 0.91, created_at: iso(0, 8), judgment: null,
    },
  ];
  const w = (id, label, hint) => ({ id, kind: id[0] === 'a' ? 'author' : id[0] === 'v' ? 'venue' : 'field', label, external_id: null, hint, created_at: iso(60) });

  // ---------- Chat + delegated agent ----------
  let convs = [
    { id: 'c1', title: 'Spike-in scaling for lot B libraries', updated_at: iso(1), message_count: 6 },
    { id: 'c2', title: 'SEACR stringent vs relaxed', updated_at: iso(5), message_count: 8 },
    { id: 'c3', title: 'Bivalent promoter calls', updated_at: iso(12), message_count: 4 },
    { id: 'c4', title: 'Rewatering contrast design', updated_at: iso(14), message_count: 10 },
  ];
  const messages = {};
  const TASK = 'Test the Okafor et al. 2026 finding on this project: compare spike-in normalised H3K27me3 at the 9 NAC and 3 DREB drought-response genes across control, drought day 7, and rewatered day 14. Plot each gene across the three time points and report which genes stay repressed after rewatering.';
  const TAGLINE = 'K27 recovery after rewatering';
  const RUN_DIR = `${ROOT}/.tuva/runs/r-rewater`;
  const HEADLINE = 'K27 stays low at 6 of 9 NAC genes after rewatering, including GmNAC11, while all DREB genes recover by day 14.';
  const SUMMARY = `${HEADLINE} That matches the persistent NAC subset in Okafor et al. 2026; GmNAC3, GmNAC109 and GmNAC62 recover like the DREB genes.`;
  const DELIVERABLES = [
    { path: 'rewater_nac_k27.png', kind: 'figure', summary: 'K27 at drought-response genes across control, drought day 7 and rewatered day 14', primary: true, artifactPath: `${ROOT}/tuva-artifacts/r-rewater/rewater_nac_k27.png`, reportedAt: null },
    { path: 'nac_recovery_table.csv', kind: 'table', summary: 'Per-gene K27 (spike-in normalised) at each time point', primary: false, artifactPath: `${ROOT}/tuva-artifacts/r-rewater/nac_recovery_table.csv`, reportedAt: null },
    { path: 'README.md', kind: 'log', summary: 'Work log', primary: false, artifactPath: null, reportedAt: null },
  ];
  let run = null;
  const runInfo = () => run && ({
    runId: 'r-rewater', status: run.status, task: TASK, tagline: TAGLINE, runDir: RUN_DIR, conversationId: run.conv, projectId: PID,
    summary: run.status === 'completed' ? SUMMARY : null, headline: run.status === 'completed' ? HEADLINE : '',
    deliverables: run.status === 'completed' ? DELIVERABLES.map((d) => ({ ...d, reportedAt: run.ended })) : [], error: null,
    endedAt: run.status === 'completed' ? run.ended : null, chatConversationId: null, busy: false, chatTurns: 0,
    conversationTitle: 'Test the Okafor 2026 paper', profile: 'default', origin: 'user', question: null,
  });
  const runFrame = () => {
    const r = runInfo();
    return {
      type: 'run_update', run_id: r.runId, project_id: PID, conversation_id: r.conversationId, status: r.status, task: r.task, tagline: r.tagline,
      run_dir: r.runDir, summary: r.summary, headline: r.headline, origin: 'user', question: null, error: null, ended_at: r.endedAt,
      chat_conversation_id: null, busy: false, last_activity: new Date().toISOString(), chat_turns: 0,
      deliverables: r.deliverables.map((d) => ({ path: d.path, kind: d.kind, summary: d.summary, primary: d.primary, artifact_path: d.artifactPath, reported_at: d.reportedAt })),
    };
  };
  const stream = (text, chunkMs, done) => {
    const pieces = text.match(/[\s\S]{1,6}/g);
    let i = 0;
    const step = () => {
      if (i >= pieces.length) { done && done(); return; }
      emit('frame', { type: 'chunk', content: pieces[i++] });
      setTimeout(step, chunkMs);
    };
    step();
  };
  let pendingApproval = null;
  async function sendMessage(text, convId) {
    messages[convId] = [{ role: 'user', content: text }];
    if (!convs.find((c) => c.id === convId)) convs = [{ id: convId, title: 'Test the Okafor 2026 paper', updated_at: new Date().toISOString(), message_count: 2 }, ...convs];
    const intro = 'Okafor et al. 2026 found that H3K27me3 loss persists after rewatering at a subset of NAC genes. Your rewatered day-14 libraries are in, so we can test that directly. I\'ll hand it to an agent so you can keep working.';
    setTimeout(() => stream(intro, demo.chunkMs || 10, () => {
      emit('frame', { type: 'tool_call_start', name: 'mcp__tuva-context__launch_agent', tool_use_id: 't1' });
      setTimeout(() => {
        pendingApproval = { convId, intro };
        emit('frame', { type: 'tool_approval_request', request_id: 'r1', name: 'mcp__tuva-context__launch_agent', kind: 'agent_launch', command: 'launch_agent', path: '', diff: TASK, summary: 'Launch an agent to complete this task?', tool_use_id: 't1' });
      }, 250);
    }), demo.thinkMs || 600);
  }
  async function decide(requestId, approve) {
    if (!pendingApproval || !approve) return;
    const { convId, intro } = pendingApproval;
    pendingApproval = null;
    setTimeout(() => {
      emit('frame', { type: 'tool_call_end', tool_use_id: 't1', name: 'mcp__tuva-context__launch_agent', ok: true });
      run = { status: 'running', conv: convId, ended: null };
      emit('frame', runFrame());
      const after = ' I\'ll report back here when it finishes.';
      stream(after, demo.chunkMs || 10, () => {
        emit('frame', { type: 'end' });
        messages[convId].push({ role: 'assistant', content: intro + after });
      });
      setTimeout(() => {
        run.status = 'completed';
        run.ended = new Date().toISOString();
        demo.runDone = true;
        emit('frame', runFrame());
      }, demo.runMs || 4000);
    }, 300);
  }
  const TRANSCRIPT = [
    { role: 'user', content: TASK },
    { role: 'assistant', content: `> Reading the sample sheet and library QC for control, drought day 7 and rewatered day 14
> Using the spike-in scaling factors from scratch_spikein_norm.ipynb so lot-B libraries are comparable
> Pulling promoter H3K27me3 for 9 NAC and 3 DREB genes from the SEACR peak tables

**${HEADLINE}**

- Persistent (K27 at day 14 below 0.6 of control): GmNAC11, GmNAC29, GmNAC81, GmNAC6, GmNAC17, GmNAC42
- Recovered: GmNAC3, GmNAC109, GmNAC62 and all three DREB genes
- This matches the persistent NAC subset reported by Okafor et al. 2026.

The figure plots each gene across the three time points; the table has the per-replicate values.` },
  ];
  let figData = null;
  fetch('./fig.png').then((r) => r.blob()).then((b) => new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); })).then((d) => { figData = d; });

  // ---------- Sessions ----------
  const sessionsList = () => {
    const out = [];
    if (demo.ccLaunched) out.push({ id: 's-cc-new', engine: 'claude_code', title: 'Fig 3b: add the rewatering panel', surface: 'terminal', projectId: PID, projectName: 'soy-drought-k27', status: 'live', turns: 3, lastActivity: new Date().toISOString(), origin: 'launched', resumable: true, hasTranscript: true });
    if (run) out.push({ id: 's-run', engine: 'tuva_run', title: TAGLINE, surface: 'desktop', projectId: PID, projectName: 'soy-drought-k27', status: run.status === 'completed' ? 'ended' : 'live', run: runInfo(), turns: 4, lastActivity: run.ended || new Date().toISOString(), origin: 'launched', resumable: false, hasTranscript: true });
    out.push(
      { id: 's-cc1', engine: 'claude_code', title: 'Spike-in scaling factors for lot B libraries', surface: 'terminal', projectId: PID, projectName: 'soy-drought-k27', status: 'ended', turns: 38, lastActivity: iso(1, 15), origin: 'captured', resumable: true, hasTranscript: true },
      { id: 's-cx1', engine: 'codex', title: 'DiffBind script takes a scaling-factor table', surface: 'terminal', projectId: PID, projectName: 'soy-drought-k27', status: 'ended', turns: 22, lastActivity: iso(9, 16), origin: 'captured', resumable: true, hasTranscript: true },
      { id: 's-cc2', engine: 'claude_code', title: 'SEACR stringent vs relaxed thresholds', surface: 'vscode', projectId: PID, projectName: 'soy-drought-k27', status: 'ended', turns: 17, lastActivity: iso(12, 11), origin: 'captured', resumable: true, hasTranscript: true },
    );
    return { sessions: out, unreadableProjects: [] };
  };

  const MCP = ['claude', 'codex', 'cursor', 'claude-desktop'].map((t) => ({ target: t, state: 'connected', detail: 'Wired to Tuva.', configPath: '', command: 'tuva-mcp', appInstalled: true }));
  const project = { id: PID, name: 'soy-drought-k27', root: ROOT };
  const launcher = {
    project_id: PID, title: 'soy-drought-k27', description: 'Soybean root H3K27me3 under drought and rewatering', roots: [ROOT], members: [], data_root: `${ROOT}/.tuva`, data_root_override: null, membership_generation: 3, created_at: iso(92), last_attached_at: iso(0), origin: 'desktop', kind: 'project',
    reachable: true, conversations: 23, lastActivity: iso(0), lastConversationTitle: 'Spike-in scaling for lot B libraries', readme: null, repo: 'aryan/soy-drought-k27', branch: 'main', indexedFiles: 1284, papers: 18, notebooks: 24,
  };

  const bridge = {
    version: '0.1.15', platform: 'darwin',
    sendMessage, cancel: async () => {}, decide,
    onFrame: sub('frame'), onStatus: sub('status'), onReset: sub('reset'),
    getStatus: async () => ({ phase: 'connected', workspaceId: 'ws1' }),
    getSnapshot: async () => null,
    index: {
      onStatus: sub('index'),
      getStatus: async () => ({ phase: 'idle' }),
      summary: async () => ({ ok: true, summary: { totalFiles: 1284, totalChunks: 41872, lastIndexedAt: iso(0, 9), indexSizeBytes: 612e6, files: FILES, skipped: { count: 3914, extensions: ['.fastq.gz', '.bam', '.bw'] }, deferred: null } }),
      run: async () => ({ ok: true, summary: {} }),
    },
    projects: {
      list: async () => ({ projects: [project], activeId: PID }), defaultRoots: async () => [ROOT],
      add: async () => ({ projects: [project], activeId: PID }), setActive: async () => ({ projects: [project], activeId: PID }),
      remove: async () => ({ projects: [project], activeId: PID }), onChanged: sub('projects'),
    },
    registry: {
      list: async () => ({ projects: [launcher], activeId: PID, error: null }),
      open: async () => ({ projects: [project], activeId: PID }),
      summary: async () => 'Soybean root H3K27me3 under drought and rewatering', reveal: async () => null,
    },
    sources: { list: async () => [...remoteEntries(), ROOT_ENTRY], add: async () => ({ ok: true }), remove: async () => ({ ok: true }) },
    connector: {
      providers: async () => ({ state: 'ok', providers: PROVIDERS }),
      items: async (p) => later({ state: 'ok', items: ITEMS[p] || [] }, 200),
      search: async (p, q) => ({ state: 'ok', items: (ITEMS[p] || []).filter((i) => i.title.toLowerCase().includes(q.toLowerCase())) }),
      children: async () => ({ state: 'ok', items: [] }),
      synced: async (p) => syncedList(p),
      select: async () => ({ ok: true }), retry: async () => ({ ok: true }), syncNow: async () => ({ ok: true }),
      syncState: async () => ({ phase: 'idle' }), cancelSync: async () => ({ phase: 'idle' }), onSyncStatus: sub('sync'),
      disconnect: async (p) => syncedList(p), connect: async () => ({ ok: true, opened: false }), account: async () => 'connected',
    },
    conversations: { list: async () => convs.slice(), messages: async (id) => messages[id] || [], delete: async () => {} },
    theme: { get: async () => 'light', set: async (t) => t },
    graphChats: { list: async () => [], load: async () => null, save: async () => [], remove: async () => [] },
    sessions: {
      list: async () => sessionsList(),
      ingest: async () => {},
      harnesses: async () => [
        { engine: 'claude_code', installed: true, auth: 'authenticated', version: '2.4.1', launchSupported: true, mcp: 'connected' },
        { engine: 'codex', installed: true, auth: 'authenticated', version: '0.48.0', launchSupported: true, mcp: 'connected' },
      ],
      launch: async (engine) => {
        demo.ccLaunched = true;
        setTimeout(() => { demo.ccDone = true; }, demo.ccMs || 2500);
        return { ok: true, reason: 'launched', sessionId: 's-cc-new' };
      },
      resume: async () => ({ ok: true, reason: 'resumed' }),
    },
    mcp: { targets: async () => MCP, setTarget: async (t) => MCP.find((m) => m.target === t) },
    memory: {
      contextGraph: async () => ({ ok: false, message: 'n/a' }),
      agentSessions: async () => ({ available: true, enabled: true, sessions: 214, turns: 1888, days: 60, running: false, ready: true, bySource: { claude_code: 1486, codex: 402, cursor: 96, claude_science: 41 }, detected: { claude_code: true, codex: true, cursor: true, claude_science: true }, lastIngestAt: iso(0, 9), ok: true }),
      setAgentSessions: async () => null, agentSessionsEverSet: async () => true,
      backfillStatus: async () => ({ running: false, ready: true, finishedAt: iso(0, 3) }),
      episodeGraph: async () => ({ ok: false, message: 'n/a' }),
      state: async () => ({ state: stateText(), updatedAt: new Date().toISOString(), status: 'ready', stateError: false, digests: DIGESTS, digestsError: false, hasMore: true }),
      rebuildState: async () => ({ ok: true }), digests: async () => ({ digests: [], hasMore: false }),
      openFile: async () => true, agentAsk: async () => ({ ok: false }), onAgentChunk: sub('agentChunk'),
    },
    update: { get: async () => ({ status: 'idle' }), install: async () => {}, onChanged: sub('update') },
    feedback: { submit: async () => ({ ok: true }), upload: async () => ({ ok: true }) },
    report: { build: async () => null, send: async () => ({ ok: true }), save: async () => ({ ok: true }) },
    onboarding: { status: async () => null, setSeen: async () => ({ ok: true }), setupStatus: async () => 'skip', setupMarkDone: async () => {} },
    digest: {
      list: async () => ({ items: DIGEST_ITEMS, unread: demo.digestRead ? 0 : 1, hasMore: false }),
      markRead: async () => { demo.digestRead = true; return 0; }, unread: async () => (demo.digestRead ? 0 : 1),
      run: async () => ({ ok: true }), runState: async () => false, runStatus: async () => ({ running: false, status: 'ok', surfaced: 1 }),
      setViewing: (v) => { if (v && !demo.digestRead) setTimeout(() => { demo.digestRead = true; emit('digestChanged', 0); }, 900); }, onOpen: sub('digestOpen'), schedulerStatus: async () => null,
      backgroundPrefs: async () => ({ enabled: true }), setBackgroundPrefs: async () => ({ ok: true }),
      emailPrefs: async () => null, setEmailPrefs: async () => ({ ok: true }),
      watchlist: async () => ({ author: [w('a1', 'Zoya Avramova', 'Univ. of Nebraska')], venue: [w('v1', 'The Plant Cell', null), w('v2', 'bioRxiv · Plant Biology', null)], field: [w('f1', 'Plant epigenetics', null), w('f2', 'Drought stress memory', null)] }),
      watchlistSearch: async () => [], addWatch: async () => ({ ok: true }), removeWatch: async () => ({ ok: true }),
      schedulerInstall: async () => ({ ok: true }), schedulerUninstall: async () => ({ ok: true }),
      onRunning: sub('digestRunning'), feedback: async () => true, onChanged: sub('digestChanged'),
    },
    runs: {
      capability: async () => ({ available: true, reason: '' }),
      draft: async () => ({ ok: false, code: 'demo', error: 'n/a' }),
      launch: async () => ({ ok: false, code: 'demo', error: 'n/a' }),
      list: async () => (run ? [runInfo()] : []),
      cancel: async () => ({ ok: false, code: 'demo', error: 'n/a' }),
      thumbnail: async (dir, path) => (path.endsWith('.png') && figData ? { dataUrl: figData, width: 2200, height: 1200 } : null),
      text: async () => null,
      openOnReturn: async () => true,
      transcript: async () => TRANSCRIPT,
      unseen: async () => ({}), seen: async () => null,
      answer: async () => ({ ok: false, code: 'demo', error: 'n/a' }), message: async () => ({ ok: false, code: 'demo', error: 'n/a' }),
      open: async () => null, reveal: async () => null, download: async () => null,
    },
    auth: {
      status: async () => ({ authenticated: true, email: 'aryan@tuva.ai', user_id: 'u1', first_name: 'Aryan', mode: 'cloud', terms: { accepted: true, terms_version: '1', privacy_version: '1', terms_url: '#', privacy_url: '#' } }),
      onChanged: sub('auth'), signOut: async () => ({ ok: true }),
    },
    analytics: new Proxy({}, { get: () => () => {} }),
  };

  const wrap = (obj, path) => new Proxy(obj, {
    get(t, key) {
      if (typeof key === 'symbol') return t[key];
      if (key in t) {
        const v = t[key];
        return v && typeof v === 'object' && !Array.isArray(v) ? wrap(v, `${path}.${key}`) : v;
      }
      if (String(key).startsWith('on')) return () => () => {};
      console.warn('[mock] missing', `${path}.${String(key)}`);
      return async () => null;
    },
  });
  window.tuva = wrap(bridge, 'tuva');
})();
