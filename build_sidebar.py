import sys

with open('frontend/src/pages/EvidencePage.jsx.bak', 'r') as f:
    orig_lines = f.readlines()

start_idx = 655
end_idx = 1350

new_jsx = """  return (
    <PageLayout
      title="Evidence & Ingestion"
      subtitle="Manage your evidence files and monitor the ingestion queue."
      fullWidth={true}
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* LEFT SIDEBAR: INGESTION QUEUE */}
        <div className="xl:col-span-4 bg-surface-2/40 rounded-2xl p-6 border border-line xl:sticky xl:top-6 shadow-sm flex flex-col h-max max-h-[90vh] overflow-y-auto">
          <div className="flex items-center gap-2 mb-6 sticky top-0 bg-surface-2/40 pt-2 pb-4 z-10 backdrop-blur-sm">
            <Zap size={22} className="text-accent" />
            <h2 className="text-lg font-bold text-ink-0">Ingestion Queue</h2>
          </div>
          
          {/* Settings modal */}
          {editingJob && (
            <EditSettingsModal
              job={editingJob}
              onClose={() => setEditingJob(null)}
              onSaved={loadQueue}
            />
          )}

          {/* Currently Processing */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-ink-1 uppercase tracking-wider mb-4 flex items-center justify-between">
              Currently Processing
              <span className="bg-surface-3 text-ink-0 py-0.5 px-2 rounded-full text-xs">{running.length}</span>
            </h3>
            <div className="space-y-3">
              {running.length === 0 ? (
                <p className="text-sm text-ink-2 italic bg-surface-1 p-3 rounded-lg border border-line border-dashed">No active jobs</p>
              ) : (
                running.map(job => (
                  <div key={job.id} className="bg-surface-1 border border-accent/30 rounded-xl p-3 shadow-[0_0_15px_rgba(var(--accent),0.1)] relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-semibold text-ink-0 text-sm truncate pr-4" title={job.original_filename}>
                        {job.original_filename}
                      </p>
                      <button
                        onClick={() => handleStop(job.id)}
                        disabled={stoppingJobs[job.id]}
                        className="text-danger hover:bg-danger hover:text-white p-1 rounded transition-colors"
                        title="Stop Ingestion"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="mb-2">
                      <p className="text-[10px] text-ink-2 uppercase font-mono mb-1">{job.current_step || 'Processing...'}</p>
                      <ProgressBar percent={job.progress_percent} status="Running" />
                    </div>
                    <div className="flex justify-between items-center text-xs text-ink-2">
                      <span>{job.cpu_throttle_percent}% CPU</span>
                      <span>{(job.min_free_ram_mb / 1024).toFixed(1)}GB RAM</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Ingestion */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-ink-1 uppercase tracking-wider mb-4 flex items-center justify-between">
              Pending
              <span className="bg-surface-3 text-ink-0 py-0.5 px-2 rounded-full text-xs">{waiting.length}</span>
            </h3>
            <div className="space-y-3">
              {waiting.length === 0 ? (
                <p className="text-sm text-ink-2 italic bg-surface-1 p-3 rounded-lg border border-line border-dashed">Queue is empty</p>
              ) : (
                waiting.map((job, index) => (
                  <div key={job.id} className="bg-surface-1 border border-line rounded-xl p-3 relative group hover:border-accent/50 transition-colors">
                    <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-surface-3 rounded-full flex items-center justify-center text-[10px] font-bold text-ink-1 border border-line">
                      {index + 1}
                    </div>
                    <div className="ml-2 flex justify-between items-center">
                      <div className="overflow-hidden">
                        <p className="font-semibold text-ink-0 text-sm truncate" title={job.original_filename}>
                          {job.original_filename}
                        </p>
                        <p className="text-xs text-ink-2 mt-0.5">
                          {formatBytes(job.file_size_bytes)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingJob(job)}
                          className="p-1.5 text-ink-2 hover:text-accent hover:bg-surface-2 rounded"
                          title="Edit Settings"
                        >
                          <Settings size={14} />
                        </button>
                        <button
                          onClick={() => handleForceStart(job.id)}
                          disabled={overrideJobs[job.id]}
                          className="p-1.5 text-ink-2 hover:text-success hover:bg-surface-2 rounded"
                          title="Force Start"
                        >
                          <Play size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Queue History */}
          <div>
            <h3 className="text-sm font-semibold text-ink-1 uppercase tracking-wider mb-4 flex items-center justify-between">
              History
            </h3>
            <div className="space-y-2">
              {history.map(job => (
                <div key={job.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-1 transition-colors group">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {statusIcon[job.status] || <Clock size={14} className="text-ink-2 shrink-0" />}
                    <p className="text-xs text-ink-0 truncate max-w-[150px]" title={job.original_filename}>
                      {job.original_filename}
                    </p>
                  </div>
                  <span className="text-[10px] text-ink-2 whitespace-nowrap">
                    {new Date(job.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MAIN CONTENT AREA: RESOURCES, UPLOAD, EVIDENCE */}
        <div className="xl:col-span-8 space-y-8">
          
          {/* 1. System Resources (Top) */}
          {sysInfo && (
            <div className="bg-surface-2/40 border border-line rounded-xl p-5 shadow-sm flex flex-col justify-center">
              <div className="flex items-center justify-between mb-4">
                 <h2 className="text-sm font-bold text-ink-0 flex items-center gap-2"><Cpu size={16} className="text-accent" /> System Resources</h2>
                 <span className="text-[10px] font-mono text-ink-2 uppercase tracking-widest bg-surface-3 px-2 py-1 rounded">Live Monitor</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-ink-2 mb-1">Available RAM</p>
                  <p className={`text-xl font-bold ${ramColor}`}>
                    {(sysInfo.system.available_ram_mb / 1024).toFixed(1)} <span className="text-sm font-normal text-ink-2">GB</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-2 mb-1">CPU Usage</p>
                  <p className="text-xl font-bold text-ink-0">
                    {sysInfo.system.cpu_percent}% <span className="text-sm font-normal text-ink-2">({sysInfo.system.cpu_count} cores)</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-2 mb-1">Pipeline Activity</p>
                  <p className="text-xl font-bold text-ink-0">
                    {running.length} <span className="text-sm font-normal text-ink-2">active</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-2 mb-1">Queue</p>
                  <p className="text-xl font-bold text-ink-0">
                    {waiting.length} <span className="text-sm font-normal text-ink-2">pending</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. Upload Section (Middle) */}
          <div>
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-lg font-bold text-ink-0 flex items-center gap-2">
                 <UploadCloud size={20} className="text-accent" /> Upload Evidence
               </h2>
               <button
                 onClick={() => setShowFormats(!showFormats)}
                 className="flex items-center gap-1.5 text-xs text-ink-2 hover:text-accent transition-colors"
               >
                 <Info size={12} /> {showFormats ? 'Hide formats' : 'Supported formats'}
               </button>
            </div>
            
            {showFormats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-5">
                {FILE_GROUPS.map(group => (
                  <div key={group.label} className="bg-surface-2 border border-line rounded-xl p-3 flex gap-3">
                    <group.icon size={18} className={`${group.color} shrink-0 mt-0.5`} />
                    <div>
                      <p className="text-xs font-semibold text-ink-0">{group.label}</p>
                      <p className="text-[10px] text-ink-2 leading-tight mt-0.5">{group.exts}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div
              id="drop-zone"
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault()
                setDragOver(false)
                if (e.dataTransfer.files.length > 0) {
                  handleUpload(e.dataTransfer.files[0])
                }
              }}
              onClick={() => fileRef.current?.click()}
              className={`w-full border-2 border-dashed rounded-2xl py-16 px-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all
                ${dragOver ? 'border-accent bg-accent/10 scale-[1.01]' : 'border-line bg-surface-1 hover:border-accent/50 hover:bg-surface-2/20'}`}
            >
              <Upload size={40} className="mb-4 text-ink-2" />
              <p className="text-ink-0 font-bold text-lg mb-1">Upload Evidence</p>
              <p className="text-ink-2 text-sm">Drag & drop your files here, or click to browse</p>
              
              <input
                type="file"
                ref={fileRef}
                className="hidden"
                onChange={e => {
                  if (e.target.files.length > 0) handleUpload(e.target.files[0])
                }}
              />
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4 bg-surface-2/30 p-4 rounded-xl border border-line">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-ink-1 uppercase tracking-wider mb-1.5">
                  Investigator Name
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" />
                  <input
                    type="text"
                    value={ingestedBy}
                    onChange={e => setIngestedBy(e.target.value)}
                    placeholder="Enter your name..."
                    className="w-full bg-surface-1 border border-line rounded-lg pl-9 pr-4 py-2 text-sm text-ink-0 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="recover-deleted"
                  checked={recoverDeleted}
                  onChange={e => setRecoverDeleted(e.target.checked)}
                  className="rounded border-line text-accent focus:ring-accent bg-surface-1"
                />
                <label htmlFor="recover-deleted" className="text-sm text-ink-1 cursor-pointer select-none">
                  Recover deleted files
                </label>
              </div>
            </div>
          </div>

          {/* 3. Uploaded Evidence List (Bottom) */}
          <div>
            <h2 className="text-lg font-bold text-ink-0 mb-4 flex items-center gap-2"><Database size={20} className="text-accent" /> Evidence Library</h2>
            <div className="space-y-4">
              {evidence.map(ev => {
                const Icon = getFileIcon(ev.original_filename);
                
                const rawJob = running.find(j => j.evidence_id === ev.id) || 
                               waiting.find(j => j.evidence_id === ev.id) || 
                               history.find(j => j.evidence_id === ev.id);
                const job = rawJob ? mergeProgress(rawJob) : null;
                const isProcessing = job && (job.status === 'Running' || job.status === 'Queued');
                const isCompleted = (job && job.status === 'Completed') || ev.status === 'Indexed';

                return (
                  <div key={ev.id} className="bg-surface-1 border border-line rounded-xl overflow-hidden hover:border-accent/30 transition-colors shadow-sm">
                    <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                       <div className="flex items-center gap-3">
                         <div className="p-2 bg-surface-2 rounded-lg border border-line shrink-0">
                           <Icon size={18} className="text-accent" />
                         </div>
                         <div>
                           <p className="font-semibold text-ink-0 text-sm">
                             {ev.original_filename}
                           </p>
                           <p className="text-xs text-ink-2 mt-0.5">
                             {formatBytes(ev.file_size_bytes)} · Uploaded by {ev.ingested_by}
                           </p>
                         </div>
                       </div>
                       
                       <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                         {!isProcessing && !isCompleted && (
                           <div className="flex items-center gap-3 bg-surface-2/50 p-2 rounded-lg border border-line">
                              <div className="flex items-center gap-2">
                                <label className="text-[10px] font-semibold text-ink-2 uppercase">RAM</label>
                                <input
                                  type="range" min="0.5" max="16" step="0.5"
                                  value={(queueConfig[ev.id]?.min_free_ram_mb || 2048) / 1024}
                                  onChange={e => setQueueConfig(prev => ({...prev, [ev.id]: { ...prev[ev.id], min_free_ram_mb: Math.round(parseFloat(e.target.value) * 1024) }}))}
                                  className="w-16 accent-accent"
                                />
                              </div>
                              <div className="flex items-center gap-2 border-l border-line pl-3">
                                <label className="text-[10px] font-semibold text-ink-2 uppercase">CPU</label>
                                <input
                                  type="range" min="10" max="100" step="10"
                                  value={queueConfig[ev.id]?.cpu_throttle_percent || 70}
                                  onChange={e => setQueueConfig(prev => ({...prev, [ev.id]: { ...prev[ev.id], cpu_throttle_percent: parseInt(e.target.value) }}))}
                                  className="w-16 accent-accent"
                                />
                              </div>
                              <button
                                onClick={() => handleAddToQueue(ev)}
                                disabled={addingToQueue[ev.id]}
                                className="ml-2 text-[10px] font-bold bg-accent text-white px-3 py-1.5 rounded flex items-center gap-1 hover:bg-accent-hover transition-colors disabled:opacity-50"
                              >
                                {addingToQueue[ev.id] ? <Loader size={10} className="animate-spin"/> : <Plus size={10} />} Queue
                              </button>
                           </div>
                         )}
                         <div className="flex items-center gap-3">
                           {statusIcon[job ? job.status : ev.status] || <Clock size={14} className="text-ink-2" />}
                           <Badge label={job ? job.status : ev.status} />
                           {!isProcessing && (
                             <button
                               onClick={() => setConfirmArchive(ev)}
                               className="p-1.5 rounded text-ink-2 hover:bg-surface-2 hover:text-danger transition-colors"
                             >
                               <Archive size={14} />
                             </button>
                           )}
                         </div>
                       </div>
                    </div>
                  </div>
                )
              })}
              {evidence.length === 0 && (
                <div className="text-center py-8 border border-dashed border-line rounded-xl text-ink-2 text-sm">
                  No evidence uploaded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <ConfirmDialog
        isOpen={!!confirmArchive}
        title="Archive Evidence"
        message={`Archive "${confirmArchive?.original_filename}"? This removes it from active investigations. The file is kept on disk but AI queries will no longer return its content.`}
        confirmLabel="Archive"
        confirmClassName="bg-danger hover:bg-red-600 text-white"
        onConfirm={() => handleArchive(confirmArchive)}
        onCancel={() => setConfirmArchive(null)}
      />
    </PageLayout>
"""

final_lines = orig_lines[:start_idx] + [new_jsx + "\n"] + orig_lines[end_idx+1:]

# Make sure UploadCloud is imported
import_line = "import { UploadCloud"
has_import = False
for l in final_lines:
    if import_line in l:
        has_import = True
if not has_import:
    for i, l in enumerate(final_lines):
        if "import { Upload" in l:
            final_lines[i] = l.replace("import { Upload", "import { Upload, UploadCloud")
            break

with open('frontend/src/pages/EvidencePage.jsx', 'w') as f:
    f.writelines(final_lines)
print("Updated successfully")
