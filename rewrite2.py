import sys

with open('frontend/src/pages/EvidencePage.jsx', 'r') as f:
    lines = f.readlines()

# The exact return of EvidencePage starts at 655 (0-indexed)
# Let's verify line 655 is `  return (\n`
start_idx = 655
if "return (" not in lines[start_idx]:
    # fallback search
    for i, l in enumerate(lines):
        if "useEffect(() => { loadAll();" in l:
            start_idx = i + 1
            break

# find the last `</PageLayout>`
end_idx = -1
for i in range(len(lines)-1, -1, -1):
    if "</PageLayout>" in lines[i]:
        end_idx = i
        break

new_jsx = """  return (
    <PageLayout
      title="Evidence Pipeline"
      subtitle="Upload, configure, and monitor digital evidence ingestion all in one unified dashboard."
      fullWidth={true}
    >
      {/* Top Level: SysInfo & Dropzone Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 items-stretch">
        
        {/* Dropzone (takes 1 column) */}
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
          className={`col-span-1 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors
            ${dragOver ? 'border-accent bg-accent/10' : 'border-line bg-surface-1 hover:border-accent/50'}`}
        >
          <Upload size={28} className="mb-2 text-ink-2" />
          <p className="text-ink-0 font-medium text-sm">Upload Evidence</p>
          <p className="text-ink-2 text-xs mt-1">Drag & drop or click</p>
          
          <input
            type="file"
            ref={fileRef}
            className="hidden"
            onChange={e => {
              if (e.target.files.length > 0) handleUpload(e.target.files[0])
            }}
          />
        </div>

        {/* SysInfo (takes 2 columns) */}
        <div className="col-span-1 lg:col-span-2 bg-surface-2/40 border border-line rounded-xl p-5 shadow-sm flex flex-col justify-center">
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-sm font-bold text-ink-0 flex items-center gap-2"><Cpu size={16} className="text-accent" /> System Resources</h2>
             <span className="text-[10px] font-mono text-ink-2 uppercase tracking-widest bg-surface-3 px-2 py-1 rounded">Live Monitor</span>
          </div>
          {sysInfo ? (
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
          ) : (
            <div className="flex items-center gap-2 text-xs text-ink-2 h-14">
               <Loader size={12} className="animate-spin" /> Fetching system metrics...
            </div>
          )}
        </div>
      </div>

      {/* Main Evidence Pipeline */}
      <div className="space-y-4 max-w-5xl mx-auto">
        <h2 className="text-lg font-bold text-ink-0 mb-4 flex items-center gap-2"><Activity size={18} className="text-accent" /> Active Evidence Pipeline</h2>
        
        {evidence.length === 0 && (
          <div className="py-12 text-center border border-dashed border-line rounded-xl">
             <Database size={32} className="mx-auto mb-3 text-ink-2 opacity-50" />
             <p className="text-ink-2">No evidence files yet</p>
             <p className="text-xs text-ink-3 mt-1">Upload a file above to begin the pipeline</p>
          </div>
        )}
        
        {evidence.map(ev => {
          const Icon = getFileIcon(ev.original_filename);
          // Find if there is an active/completed job for this evidence
          const rawJob = running.find(j => j.evidence_id === ev.id) || 
                         waiting.find(j => j.evidence_id === ev.id) || 
                         history.find(j => j.evidence_id === ev.id);
          const job = rawJob ? mergeProgress(rawJob) : null;
          
          const isProcessing = job && (job.status === 'Running' || job.status === 'Queued' || overrideJobs[job.id] || stoppingJobs[job.id]);
          const isCompleted = (job && job.status === 'Completed') || ev.status === 'Indexed';
          const hasFailed = (job && job.status === 'Failed') || ev.status === 'Failed';
          const isQueued = job && job.status === 'Queued';
          const isUploaded = !isProcessing && !isCompleted && !hasFailed;
          
          return (
            <div key={ev.id} className="bg-surface-1 border border-line rounded-xl overflow-hidden transition-all shadow-sm">
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between bg-surface-2/20 border-b border-line/40 gap-4">
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
                 
                 <div className="flex items-center gap-3 self-end sm:self-auto">
                   {statusIcon[job ? job.status : ev.status] || <Clock size={14} className="text-ink-2" />}
                   <Badge label={job ? job.status : ev.status} />
                   
                   {/* Archive button only available if not actively processing */}
                   {!isProcessing && (
                     <button
                       onClick={() => setConfirmArchive(ev)}
                       className="p-1.5 rounded text-ink-2 hover:bg-surface-2 hover:text-danger transition-colors border border-transparent hover:border-line"
                       title="Archive evidence"
                     >
                       <Archive size={14} />
                     </button>
                   )}
                 </div>
              </div>
              
              {/* Card Body changes based on state */}
              <div className="p-4">
                 {isProcessing ? (
                   // PROGRESS VIEW
                   <div className="w-full">
                     <div className="flex items-center justify-between mb-2">
                       <p className="text-xs font-medium text-ink-0 flex items-center gap-2">
                         {isQueued ? (
                           <><Clock size={12} className="text-warning" /> Waiting for resources...</>
                         ) : (
                           <><Loader size={12} className="text-accent animate-spin" /> {job.current_step || 'Processing...'}</>
                         )}
                       </p>
                       <div className="flex items-center gap-2">
                         {/* Force Start if Queued */}
                         {isQueued && (
                           <button
                             onClick={() => handleForceStart(job.id)}
                             disabled={overrideJobs[job.id]}
                             className="text-[10px] uppercase font-bold text-accent border border-accent/20 bg-accent/5 px-2 py-1 rounded hover:bg-accent hover:text-white transition-colors disabled:opacity-50"
                           >
                             Force Start
                           </button>
                         )}
                         {/* Stop Button */}
                         <button
                           onClick={() => handleStop(job.id)}
                           disabled={stoppingJobs[job.id]}
                           className="text-[10px] uppercase font-bold text-danger border border-danger/20 bg-danger/5 px-2 py-1 rounded hover:bg-danger hover:text-white transition-colors disabled:opacity-50"
                         >
                           {stoppingJobs[job.id] ? 'Stopping...' : 'Stop'}
                         </button>
                       </div>
                     </div>
                     <ProgressBar percent={job.progress_percent || 0} status={job.status} />
                   </div>
                 ) : isCompleted ? (
                   // COMPLETED VIEW
                   <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                     <p className="text-xs text-ink-1">
                       Extraction finished. The file content is now available in the database.
                     </p>
                     <div className="flex gap-2">
                       <button className="text-xs bg-surface-2 border border-line text-ink-0 px-3 py-1.5 rounded-lg hover:border-accent transition-colors">
                         View Details
                       </button>
                       <button className="text-xs bg-accent text-white px-3 py-1.5 rounded-lg hover:bg-accent-hover transition-colors shadow-[0_0_12px_rgba(var(--accent),0.3)]">
                         Search Content
                       </button>
                     </div>
                   </div>
                 ) : hasFailed ? (
                   // FAILED VIEW
                   <div className="flex items-center justify-between">
                     <p className="text-xs text-danger font-mono break-all line-clamp-2">
                       {job?.error_message || 'Ingestion failed.'}
                     </p>
                     <button
                       onClick={() => handleAddToQueue(ev)}
                       className="text-xs bg-surface-2 border border-line text-ink-0 px-3 py-1.5 rounded-lg hover:text-warning transition-colors whitespace-nowrap ml-4"
                     >
                       Retry
                     </button>
                   </div>
                 ) : (
                   // UPLOADED (READY TO INGEST) VIEW
                   <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                     {/* Resource Sliders */}
                     <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
                       <div>
                         <div className="flex items-center justify-between mb-2">
                           <label className="text-xs font-semibold text-ink-1 uppercase tracking-wider">RAM Limit</label>
                           {sysInfo && sysInfo.system.available_ram_mb < (queueConfig[ev.id]?.min_free_ram_mb || 2048) && (
                             <span className="text-[10px] text-danger flex items-center gap-1 font-medium bg-danger/10 px-1.5 py-0.5 rounded">
                               <AlertCircle size={10} /> Needs {((queueConfig[ev.id]?.min_free_ram_mb || 2048) / 1024).toFixed(1)}GB
                             </span>
                           )}
                         </div>
                         <div className="flex items-center gap-3">
                           <input
                             type="range"
                             min="0.5"
                             max="16"
                             step="0.5"
                             value={(queueConfig[ev.id]?.min_free_ram_mb || 2048) / 1024}
                             onChange={e => {
                               const val = parseFloat(e.target.value);
                               setQueueConfig(prev => ({
                                 ...prev,
                                 [ev.id]: { ...prev[ev.id], min_free_ram_mb: Math.round(val * 1024) }
                               }))
                             }}
                             className="w-full accent-accent"
                           />
                           <span className="text-xs font-mono text-ink-0 w-12 text-right">{((queueConfig[ev.id]?.min_free_ram_mb || 2048) / 1024).toFixed(1)} GB</span>
                         </div>
                       </div>
                       
                       <div>
                         <label className="text-xs font-semibold text-ink-1 uppercase tracking-wider mb-2 block">CPU Throttle</label>
                         <div className="flex items-center gap-3">
                           <input
                             type="range"
                             min="10"
                             max="100"
                             step="10"
                             value={queueConfig[ev.id]?.cpu_throttle_percent || 70}
                             onChange={e =>
                               setQueueConfig(prev => ({
                                 ...prev,
                                 [ev.id]: { ...prev[ev.id], cpu_throttle_percent: parseInt(e.target.value) }
                               }))
                             }
                             className="w-full accent-accent"
                           />
                           <span className="text-xs font-mono text-ink-0 w-10 text-right">{queueConfig[ev.id]?.cpu_throttle_percent || 70}%</span>
                         </div>
                       </div>
                     </div>
                     
                     {/* Action Buttons */}
                     <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
                       <button
                         onClick={() => handleAddToQueue(ev)}
                         disabled={addingToQueue[ev.id]}
                         className="w-full text-xs font-bold bg-accent text-white px-5 py-2.5 rounded-lg shadow-[0_0_15px_rgba(var(--accent),0.2)] hover:shadow-[0_0_20px_rgba(var(--accent),0.4)] hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                       >
                         {addingToQueue[ev.id] ? <Loader size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
                         Start Ingestion
                       </button>
                       
                       <div className="flex items-center justify-between px-1">
                         <span className="text-[10px] text-ink-2">Est. time:</span>
                         <span className="text-[10px] font-mono text-ink-0">
                           {estimates[ev.id]?.human_readable || '—'}
                         </span>
                       </div>
                     </div>
                   </div>
                 )}
              </div>
            </div>
          )
        })}
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

new_lines = lines[:start_idx] + [new_jsx + "\n"] + lines[end_idx+1:]

with open('frontend/src/pages/EvidencePage.jsx', 'w') as f:
    f.writelines(new_lines)
print("Updated successfully")
