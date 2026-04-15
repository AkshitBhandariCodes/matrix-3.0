
        <section className="savings-hero glass-strong">
          <div className="savings-hero-characters">
            <CharacterPortrait image={rekhaDiImage} name="Rekha Di" expression="happy" accentColor="#f59e0b" size={62} />
            <CharacterPortrait image={bankerImage} name="Banker Mitra" expression="thinking" accentColor="#22c55e" size={62} />
            <CharacterPortrait image={sakhiImage} name="Sakhi" expression="neutral" accentColor="#06b6d4" size={62} />
          </div>
          <div className="savings-hero-copy">
            <h2>{tt('Gaon Financial Mission', 'Village Financial Mission', 'Gaon Financial Mission')}</h2>
            <p>
              {monthlyLeft > salary * 0.3
                ? tt('Strong planning mode active.', 'Strong planning mode active.', 'Strong planning mode active.')
                : monthlyLeft > 0
                  ? tt('Budget tight hai, par control mein hai.', 'Budget is tight but controlled.', 'Budget tight hai, par control mein hai.')
                  : tt('Alert: expenses income se upar hain.', 'Alert: expenses are above income.', 'Alert: expenses income se upar hain.')}
            </p>
            <div className="savings-quest-row">
              {questProgress.map((quest) => (
                <div key={quest.id} className={`savings-quest-chip ${quest.done ? 'done' : ''}`}>
                  <span className="dot" />
                  <span>{quest.label}</span>
                </div>
              ))}
            </div>
            <div className="savings-quest-progress">
              <div className="bar"><div style={{ width: `${(completedQuests / questProgress.length) * 100}%` }} /></div>
              <span>{completedQuests}/{questProgress.length} quests</span>
            </div>
          </div>
        </section>

        <section className="savings-worldforge glass">
          <div className="savings-worldforge-head">
            <div>
              <h3><Sparkles size={15} /> {tt('World Forge', 'World Forge', 'World Forge')}</h3>
              <p>{tt('Gemini se world art banao ya fallback realm art use karo.', 'Generate world art with Gemini or use fallback realm art.', 'Gemini se world art banao ya fallback realm art use karo.')}</p>
            </div>
            <button onClick={() => void generateSceneArt()} className="btn-primary savings-forge-btn" disabled={isGeneratingArt || !isOnline}>
              {isGeneratingArt ? <Loader2 size={14} /> : <WandSparkles size={14} />}
              {tt('Generate Art', 'Generate Art', 'Generate Art')}
            </button>
          </div>
          <div className="savings-world-tabs">
            {WORLD_SCENES.map((scene) => (
              <button key={scene.id} onClick={() => setActiveSceneId(scene.id)} className={`savings-world-tab ${activeSceneId === scene.id ? 'active' : ''}`}>
                <strong>{scene.title}</strong>
                <span>{scene.subtitle}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="savings-realm-grid">
          <div className="savings-left-column">
            <div className="savings-stat-grid">
              <div className="savings-stat-card glass-card"><div className="label"><IndianRupee size={13} /> Salary</div><div className="value">Rs {formatMoney(salary)}</div></div>
              <div className="savings-stat-card glass-card"><div className="label"><Wallet size={13} /> Expenses</div><div className="value">Rs {formatMoney(totalExpenses)}</div></div>
              <div className="savings-stat-card glass-card"><div className="label"><PiggyBank size={13} /> Savings</div><div className="value">Rs {formatMoney(savingsBalance)}</div></div>
              <div className="savings-stat-card glass-card"><div className="label"><TrendingUp size={13} /> Left Month</div><div className="value">Rs {formatMoney(monthlyLeft)}</div></div>
            </div>

            <div className="savings-panel glass">
              <h3>Interest Observatory</h3>
              <p>Adjust bank rate and see one-year projection.</p>
              <div className="savings-slider-label">Rate: {interestRate.toFixed(1)}% per year</div>
              <input type="range" min={3} max={12} step={0.5} value={interestRate} onChange={(e) => setInterestRate(Number(e.target.value))} className="savings-slider" />
              <div className="savings-projection">Estimated after 1 year: Rs {formatMoney(projectedYearEnd)}</div>
            </div>

            <div className="savings-panel glass">
              <h3>FD / RD Arena</h3>
              <p>Compare one-time FD and monthly RD outcomes.</p>
              <div className="savings-slider-grid">
                <label>FD Principal: Rs {formatMoney(fdPrincipal)}
                  <input type="range" min={1000} max={100000} step={500} value={fdPrincipal} onChange={(e) => setFdPrincipal(Number(e.target.value))} className="savings-slider" />
                </label>
                <label>RD Monthly: Rs {formatMoney(rdMonthlyDeposit)}
                  <input type="range" min={100} max={10000} step={100} value={rdMonthlyDeposit} onChange={(e) => setRdMonthlyDeposit(Number(e.target.value))} className="savings-slider" />
                </label>
              </div>
              <label className="savings-tenure">Investment Years: {investmentYears}
                <input type="range" min={1} max={10} step={1} value={investmentYears} onChange={(e) => setInvestmentYears(Number(e.target.value))} className="savings-slider" />
              </label>
              <div className="savings-fd-rd-cards">
                <div className="fd-card"><h4>FD</h4><p>Invested: Rs {formatMoney(fdProjection.invested)}</p><p>Interest: Rs {formatMoney(fdProjection.interestEarned)}</p><strong>Maturity: Rs {formatMoney(fdProjection.maturity)}</strong></div>
                <div className="rd-card"><h4>RD</h4><p>Invested: Rs {formatMoney(rdProjection.invested)}</p><p>Interest: Rs {formatMoney(rdProjection.interestEarned)}</p><strong>Maturity: Rs {formatMoney(rdProjection.maturity)}</strong></div>
              </div>
              <div className="savings-guide-box">
                <p>{fdRdSmartGuide.summary}</p>
                <p>{fdRdSmartGuide.comparison}</p>
                <p className="tip">{fdRdSmartGuide.tip}</p>
                <div className="actions"><button onClick={playFdRdSmartGuide} className="btn-primary"><PlayCircle size={13} />Play Guide</button></div>
              </div>
            </div>
          </div>

          <div className="savings-right-column">
            <div className="savings-panel glass">
              <h3>Boli Khata Voice Council</h3>
              <p>Character-led voice guidance for money habits.</p>
              <div className="savings-voice-status">
                <div><strong>{isOnline ? 'Online' : 'Offline'}</strong><span>{`TTS: ${ttsDiag.provider} | ${ttsDiag.reason}`}</span></div>
                <div><strong>Offline Pack</strong><span>{audioPackStatus ? `${audioPackStatus.availableFiles}/${audioPackStatus.totalFiles} files` : 'checking...'}</span></div>
              </div>
              {audioPackStatus && !audioPackStatus.ready && <div className="savings-warning">{`Missing: ${audioPackStatus.missingFiles.slice(0, 3).join(', ')}${audioPackStatus.missingFiles.length > 3 ? '...' : ''}`}</div>}
              <div className="savings-guide-list">
                {guideItems.map((item) => (
                  <div key={item.id} className={`savings-guide-item ${activeGuideId === item.id ? 'active' : ''}`}>
                    <div className="copy"><h4>{item.title}</h4><p>{item.detail}</p></div>
                    <button onClick={() => speakGuide(item.id, `${item.title}. ${item.detail}`)} className="btn-glass"><PlayCircle size={12} />Play</button>
                  </div>
                ))}
              </div>
              <div className="savings-guide-actions">
                <button onClick={playFullGuide} className="btn-primary"><PlayCircle size={13} />Full Guide</button>
                <button onClick={() => { resetGeminiTtsLock(); resetAltCloudTtsLock(); setStatus('TTS lock reset.'); }} className="btn-glass"><RotateCcw size={12} />TTS Reset</button>
              </div>
            </div>

            <div className="savings-panel glass">
              <h3>Voice Money Console</h3>
              <p>Examples: "salary 18000 set", "2000 rent expense", "120 savings".</p>
              <div className="savings-command-row">
                <input value={commandInput} onChange={(e) => setCommandInput(e.target.value)} placeholder="Type command..." />
                <button onClick={() => void applyVoiceCommand(commandInput)} className="btn-primary" disabled={!commandInput.trim() || isParsing}>{isParsing ? <Loader2 size={13} /> : 'Parse'}</button>
                <button onClick={() => { void startAudioCapture() }} className="btn-primary mic-btn" disabled={isParsing}><Mic size={13} />{isRecordingAudio || isListening ? 'Stop' : 'Speak'}</button>
              </div>
              {status && <div className="savings-status">{status}</div>}
            </div>

            <div className="savings-panel glass">
              <h3>Recent Expense Log</h3>
              {expenses.length === 0 ? <p className="empty">No expenses recorded yet.</p> : (
                <div className="savings-expense-list">
                  {expenses.map((entry) => (
                    <div key={entry.id} className="savings-expense-row"><span>{entry.note}</span><strong>Rs {formatMoney(entry.amount)}</strong></div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
