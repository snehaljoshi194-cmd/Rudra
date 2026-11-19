import { useCallback, useEffect, useRef, useState } from 'react';
import { AchievementsModal } from './components/AchievementsModal';
import { DailyQuestsModal } from './components/DailyQuestsModal';
import { GameHud } from './components/GameHud';
import { PauseModal, ResultModal } from './components/GameOverlayModals';
import { HighlightModal } from './components/HighlightModal';
import { LevelSelectModal } from './components/LevelSelectModal';
import { OptionsModal } from './components/OptionsModal';
import { StoreModal } from './components/StoreModal';
import { TitleMenu } from './components/TitleMenu';
import { ACHIEVEMENTS } from './data/achievements';
import {
  createDefaultSaveData,
  getLevelConfig,
  getUpgradeCost,
  getVehicleSpec,
  loadSaveData,
  persistSaveData,
  recordLevelHighScore,
  TOTAL_LEVEL_COUNT,
} from './data/gameData';
import { applyRunToDailyQuests } from './data/quests';
import { GameEngine } from './engine/GameEngine';
import {
  CharacterGender,
  GameScreen,
  GameSettings,
  HighlightClip,
  HudSnapshot,
  RunResult,
  SaveData,
  UpgradeLevels,
  VehicleId,
} from './types/game';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [save, setSave] = useState<SaveData>(() => loadSaveData());
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [returnScreen, setReturnScreen] = useState<GameScreen>('menu');
  const [previewVehicleId, setPreviewVehicleId] = useState<VehicleId>(
    () => loadSaveData().equippedVehicle
  );
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [highlightClips, setHighlightClips] = useState<HighlightClip[]>([]);
  const [latestHighlightId, setLatestHighlightId] = useState<string | null>(null);
  const [viewerClipId, setViewerClipId] = useState<string | null>(null);

  const saveRef = useRef(save);
  saveRef.current = save;

  const screenRef = useRef(screen);
  screenRef.current = screen;

  const updateSave = useCallback((updater: (prev: SaveData) => SaveData) => {
    setSave((prev) => {
      const next = updater(prev);
      persistSaveData(next);
      return next;
    });
  }, []);

  const handleLevelCompleteRef = useRef<(res: RunResult) => void>(() => {});
  handleLevelCompleteRef.current = (res: RunResult) => {
    const curSave = saveRef.current;
    const prevStars = curSave.levelStars[res.level] || 0;
    const isFirstClear = prevStars === 0;
    const firstClearBonus = isFirstClear ? 75 + res.level * 10 : 0;
    const totalAdded = res.coinsEarned + firstClearBonus;

    const questOutcome = applyRunToDailyQuests(curSave.dailyQuests, res);
    const highScoreId = `hs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const hsOutcome = recordLevelHighScore(curSave.levelHighScores, res, highScoreId);

    updateSave((prev) => ({
      ...prev,
      totalCoins: prev.totalCoins + totalAdded,
      highestUnlockedLevel: Math.min(
        TOTAL_LEVEL_COUNT,
        Math.max(prev.highestUnlockedLevel, res.level + 1)
      ),
      currentLevel: res.level < TOTAL_LEVEL_COUNT ? res.level + 1 : TOTAL_LEVEL_COUNT,
      levelStars: {
        ...prev.levelStars,
        [res.level]: Math.max(prevStars, res.starsEarned),
      },
      levelHighScores: hsOutcome.nextMap,
      dailyQuests: questOutcome.nextState,
      careerStats: {
        totalDistanceMeters: prev.careerStats.totalDistanceMeters + res.distance,
        totalCoinsCollected: prev.careerStats.totalCoinsCollected + res.coinsEarned,
        totalLevelsCompleted: prev.careerStats.totalLevelsCompleted + 1,
        totalJumpsAndSlides:
          prev.careerStats.totalJumpsAndSlides + res.jumpsPerformed + res.slidesPerformed,
        totalPowerupsCollected: prev.careerStats.totalPowerupsCollected + res.powerupsCollected,
      },
    }));

    setRunResult({
      ...res,
      firstClearBonus,
      isNewBestStars: res.starsEarned > prevStars,
      highScoreId,
      highScoreRank: hsOutcome.rank,
      isNewLevelRecord: hsOutcome.rank === 1,
      newlyCompletedQuests: questOutcome.newlyCompleted,
    });
    setScreen(res.level === TOTAL_LEVEL_COUNT ? 'victory' : 'levelComplete');
  };

  const handleGameOverRef = useRef<(res: RunResult) => void>(() => {});
  handleGameOverRef.current = (res: RunResult) => {
    const curSave = saveRef.current;
    // Salvage 50% of collected coins even on a crash
    const salvaged = Math.floor(res.coinsEarned * 0.5);
    const questOutcome = applyRunToDailyQuests(curSave.dailyQuests, res);

    updateSave((prev) => ({
      ...prev,
      totalCoins: prev.totalCoins + salvaged,
      dailyQuests: questOutcome.nextState,
      careerStats: {
        totalDistanceMeters: prev.careerStats.totalDistanceMeters + res.distance,
        totalCoinsCollected: prev.careerStats.totalCoinsCollected + salvaged,
        totalLevelsCompleted: prev.careerStats.totalLevelsCompleted,
        totalJumpsAndSlides:
          prev.careerStats.totalJumpsAndSlides + res.jumpsPerformed + res.slidesPerformed,
        totalPowerupsCollected: prev.careerStats.totalPowerupsCollected + res.powerupsCollected,
      },
    }));

    setRunResult({
      ...res,
      coinsEarned: salvaged,
      newlyCompletedQuests: questOutcome.newlyCompleted,
    });
    setScreen('gameOver');
  };

  const handleHighlightReadyRef = useRef<(clip: HighlightClip, isMidRunClip: boolean) => void>(
    () => {}
  );
  handleHighlightReadyRef.current = (clip: HighlightClip, isMidRunClip: boolean) => {
    setHighlightClips((prev) => {
      const next = [clip, ...prev];
      if (next.length > 10) {
        // Drop oldest unsaved clip first to prevent unbounded Blob memory growth
        let dropIdx = -1;
        for (let i = next.length - 1; i >= 0; i--) {
          if (!next[i].savedToReel) {
            dropIdx = i;
            break;
          }
        }
        const idx = dropIdx >= 0 ? dropIdx : next.length - 1;
        const [removed] = next.splice(idx, 1);
        if (removed) URL.revokeObjectURL(removed.url);
      }
      return next;
    });
    if (!isMidRunClip) {
      setLatestHighlightId(clip.id);
    }
  };

  // Initialize Three.js GameEngine once in stable ref container
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new GameEngine(mount, {
      onHudUpdate: (snapshot) => setHud(snapshot),
      onLevelComplete: (res) => handleLevelCompleteRef.current(res),
      onGameOver: (res) => handleGameOverRef.current(res),
      onHighlightReady: (clip, isMidRun) => handleHighlightReadyRef.current(clip, isMidRun),
    });

    const initialSave = saveRef.current;
    const spec = getVehicleSpec(initialSave.equippedVehicle);
    engine.applySettings(initialSave.settings);
    engine.applyBiomeAtmosphere(initialSave.currentLevel);
    engine.setVehicle(
      initialSave.equippedVehicle,
      initialSave.vehicleColors[initialSave.equippedVehicle] || spec.defaultColor,
      initialSave.characterGender
    );
    engine.setMode('menu');
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const launchLevel = useCallback(
    (levelNum: number, activeSave?: SaveData) => {
      const s = activeSave || saveRef.current;
      const clamped = Math.max(1, Math.min(TOTAL_LEVEL_COUNT, levelNum));
      const spec = getVehicleSpec(s.equippedVehicle);
      const paint = s.vehicleColors[s.equippedVehicle] || spec.defaultColor;

      updateSave((prev) => ({ ...prev, currentLevel: clamped }));
      setRunResult(null);
      setLatestHighlightId(null);
      setScreen('playing');

      if (engineRef.current) {
        engineRef.current.setVehicle(s.equippedVehicle, paint, s.characterGender);
        engineRef.current.startLevel(clamped, s.upgrades);
      }
    },
    [updateSave]
  );

  // Global keyboard shortcuts (Esc pause/close, Enter start on menu)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const cur = screenRef.current;
      if (e.code === 'Escape') {
        if (cur === 'playing') {
          setScreen('paused');
          engineRef.current?.setMode('paused');
        } else if (cur === 'paused') {
          setScreen('playing');
          engineRef.current?.setMode('playing');
        } else if (
          cur === 'levels' ||
          cur === 'options' ||
          cur === 'quests' ||
          cur === 'achievements' ||
          cur === 'highlights'
        ) {
          setScreen(returnScreen);
        } else if (cur === 'store') {
          closeStore();
        }
      } else if (e.code === 'Enter' && cur === 'menu') {
        launchLevel(saveRef.current.currentLevel);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const handleNewGame = () => {
    const fresh = createDefaultSaveData();
    fresh.settings = { ...save.settings };
    fresh.characterGender = save.characterGender;
    persistSaveData(fresh);
    setSave(fresh);
    setPreviewVehicleId(fresh.equippedVehicle);
    launchLevel(1, fresh);
  };

  const openStore = (from: GameScreen) => {
    setReturnScreen(from);
    setPreviewVehicleId(save.equippedVehicle);
    setScreen('store');
    const spec = getVehicleSpec(save.equippedVehicle);
    engineRef.current?.setVehicle(
      save.equippedVehicle,
      save.vehicleColors[save.equippedVehicle] || spec.defaultColor,
      save.characterGender
    );
    engineRef.current?.setMode('store');
  };

  const closeStore = () => {
    const s = saveRef.current;
    const spec = getVehicleSpec(s.equippedVehicle);
    engineRef.current?.setVehicle(
      s.equippedVehicle,
      s.vehicleColors[s.equippedVehicle] || spec.defaultColor,
      s.characterGender
    );
    if (returnScreen === 'paused') {
      setScreen('paused');
      engineRef.current?.setMode('paused');
    } else {
      setScreen('menu');
      engineRef.current?.setMode('menu');
    }
  };

  const handlePreviewVehicle = (id: VehicleId) => {
    setPreviewVehicleId(id);
    const spec = getVehicleSpec(id);
    const color = save.vehicleColors[id] || spec.defaultColor;
    engineRef.current?.setVehicle(id, color, save.characterGender);
  };

  const handleSelectColor = (id: VehicleId, color: string) => {
    updateSave((prev) => ({
      ...prev,
      vehicleColors: { ...prev.vehicleColors, [id]: color },
    }));
    if (previewVehicleId === id) {
      engineRef.current?.setVehicle(id, color, save.characterGender);
    }
  };

  const handleBuyVehicle = (id: VehicleId) => {
    const spec = getVehicleSpec(id);
    if (save.ownedVehicles.includes(id)) return;
    if (save.highestUnlockedLevel < spec.unlockLevel) return;
    if (save.totalCoins < spec.cost) return;

    updateSave((prev) => ({
      ...prev,
      totalCoins: prev.totalCoins - spec.cost,
      ownedVehicles: [...prev.ownedVehicles, id],
      equippedVehicle: id,
    }));
    const color = save.vehicleColors[id] || spec.defaultColor;
    engineRef.current?.setVehicle(id, color, save.characterGender);
  };

  const handleEquipVehicle = (id: VehicleId) => {
    if (!save.ownedVehicles.includes(id)) return;
    updateSave((prev) => ({ ...prev, equippedVehicle: id }));
    const spec = getVehicleSpec(id);
    engineRef.current?.setVehicle(
      id,
      save.vehicleColors[id] || spec.defaultColor,
      save.characterGender
    );
  };

  const handleBuyUpgrade = (key: keyof UpgradeLevels) => {
    const rank = save.upgrades[key];
    if (rank >= 5) return;
    const cost = getUpgradeCost(rank);
    if (save.totalCoins < cost) return;
    updateSave((prev) => ({
      ...prev,
      totalCoins: prev.totalCoins - cost,
      upgrades: { ...prev.upgrades, [key]: rank + 1 },
    }));
  };

  const handleSetCharacterGender = (gender: CharacterGender) => {
    updateSave((prev) => ({ ...prev, characterGender: gender }));
    const activeId = screenRef.current === 'store' ? previewVehicleId : saveRef.current.equippedVehicle;
    const spec = getVehicleSpec(activeId);
    const paint = saveRef.current.vehicleColors[activeId] || spec.defaultColor;
    engineRef.current?.setVehicle(activeId, paint, gender);
  };

  const handleUpdateSettings = (next: GameSettings) => {
    updateSave((prev) => ({ ...prev, settings: next }));
    engineRef.current?.applySettings(next);
  };

  const handleToggleMute = () => {
    handleUpdateSettings({ ...save.settings, muted: !save.settings.muted });
  };

  const handleClaimQuest = (questId: string) => {
    updateSave((prev) => {
      let bonus = 0;
      const nextQuests = prev.dailyQuests.quests.map((q) => {
        if (q.id === questId && q.progress >= q.target && !q.claimed) {
          bonus = q.rewardCoins;
          return { ...q, claimed: true };
        }
        return q;
      });
      if (bonus === 0) return prev;
      return {
        ...prev,
        totalCoins: prev.totalCoins + bonus,
        dailyQuests: { ...prev.dailyQuests, quests: nextQuests },
      };
    });
  };

  const handleClaimAllQuests = () => {
    updateSave((prev) => {
      let bonus = 0;
      const nextQuests = prev.dailyQuests.quests.map((q) => {
        if (q.progress >= q.target && !q.claimed) {
          bonus += q.rewardCoins;
          return { ...q, claimed: true };
        }
        return q;
      });
      if (bonus === 0) return prev;
      return {
        ...prev,
        totalCoins: prev.totalCoins + bonus,
        dailyQuests: { ...prev.dailyQuests, quests: nextQuests },
      };
    });
  };

  const handleClaimAchievement = (achievementId: string) => {
    const def = ACHIEVEMENTS.find((a) => a.id === achievementId);
    if (!def) return;
    updateSave((prev) => {
      if (prev.claimedAchievements.includes(achievementId)) return prev;
      if (def.getProgress(prev) < def.target) return prev;
      return {
        ...prev,
        totalCoins: prev.totalCoins + def.rewardCoins,
        claimedAchievements: [...prev.claimedAchievements, achievementId],
        equippedBadgeId: prev.equippedBadgeId ?? achievementId,
      };
    });
  };

  const handleEquipBadge = (achievementId: string | null) => {
    updateSave((prev) => ({
      ...prev,
      equippedBadgeId: achievementId,
    }));
  };

  const goToMenu = () => {
    setRunResult(null);
    setScreen('menu');
    const spec = getVehicleSpec(save.equippedVehicle);
    engineRef.current?.applyBiomeAtmosphere(save.currentLevel);
    engineRef.current?.setVehicle(
      save.equippedVehicle,
      save.vehicleColors[save.equippedVehicle] || spec.defaultColor,
      save.characterGender
    );
    engineRef.current?.setMode('menu');
  };

  const handleToggleSaveHighlight = (clipId: string) => {
    setHighlightClips((prev) =>
      prev.map((c) => (c.id === clipId ? { ...c, savedToReel: !c.savedToReel } : c))
    );
  };

  const handleDeleteHighlight = (clipId: string) => {
    setHighlightClips((prev) => {
      const target = prev.find((c) => c.id === clipId);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((c) => c.id !== clipId);
    });
    if (latestHighlightId === clipId) setLatestHighlightId(null);
    if (viewerClipId === clipId) setViewerClipId(null);
  };

  const currentCfg = getLevelConfig(save.currentLevel);
  const latestHighlight =
    highlightClips.find((c) => c.id === latestHighlightId) || null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950">
      {/* Isolated Full-Viewport WebGL Mount Container */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0 h-full w-full" />

      {/* Title / Main Menu */}
      {screen === 'menu' && (
        <TitleMenu
          save={save}
          highlightCount={highlightClips.length}
          onContinue={() => launchLevel(save.currentLevel)}
          onNewGame={handleNewGame}
          onOpenLevels={() => {
            setReturnScreen('menu');
            setScreen('levels');
          }}
          onOpenStore={() => openStore('menu')}
          onOpenQuests={() => {
            setReturnScreen('menu');
            setScreen('quests');
          }}
          onOpenAchievements={() => {
            setReturnScreen('menu');
            setScreen('achievements');
          }}
          onOpenHighlights={() => {
            setViewerClipId(highlightClips[0]?.id || null);
            setReturnScreen('menu');
            setScreen('highlights');
          }}
          onOpenOptions={() => {
            setReturnScreen('menu');
            setScreen('options');
          }}
          onToggleMute={handleToggleMute}
          onSetGender={handleSetCharacterGender}
        />
      )}

      {/* 150-Level Ladakh Expedition Atlas */}
      {screen === 'levels' && (
        <LevelSelectModal
          save={save}
          onSelectLevel={(lvl) => launchLevel(lvl)}
          onClose={() => setScreen(returnScreen)}
        />
      )}

      {/* Interactive 3D Vehicle Store & Garage */}
      {screen === 'store' && (
        <StoreModal
          save={save}
          previewVehicleId={previewVehicleId}
          onSelectPreview={handlePreviewVehicle}
          onSelectColor={handleSelectColor}
          onBuyVehicle={handleBuyVehicle}
          onEquipVehicle={handleEquipVehicle}
          onBuyUpgrade={handleBuyUpgrade}
          onSetGender={handleSetCharacterGender}
          onClose={closeStore}
        />
      )}

      {/* Options Modal */}
      {screen === 'options' && (
        <OptionsModal
          settings={save.settings}
          characterGender={save.characterGender}
          onSetGender={handleSetCharacterGender}
          onUpdate={handleUpdateSettings}
          onClose={() => {
            setScreen(returnScreen);
          }}
        />
      )}

      {/* Daily Expedition Quests Modal */}
      {screen === 'quests' && (
        <DailyQuestsModal
          questState={save.dailyQuests}
          totalCoins={save.totalCoins}
          onClaimQuest={handleClaimQuest}
          onClaimAll={handleClaimAllQuests}
          onClose={() => setScreen(returnScreen)}
        />
      )}

      {/* Achievements & Cosmetic Badges Modal */}
      {screen === 'achievements' && (
        <AchievementsModal
          save={save}
          onClaimAchievement={handleClaimAchievement}
          onEquipBadge={handleEquipBadge}
          onClose={() => setScreen(returnScreen)}
        />
      )}

      {/* Highlight Reel (Last 10s Video Snippets) Modal */}
      {screen === 'highlights' && (
        <HighlightModal
          clips={highlightClips}
          initialClipId={viewerClipId}
          onToggleSaveClip={handleToggleSaveHighlight}
          onDeleteClip={handleDeleteHighlight}
          onClose={() => setScreen(returnScreen)}
        />
      )}

      {/* Active Gameplay Perimeter HUD */}
      {(screen === 'playing' || screen === 'paused') && hud && (
        <GameHud
          hud={hud}
          muted={save.settings.muted}
          showHints={save.settings.showHints}
          equippedBadgeId={save.equippedBadgeId}
          onPause={() => {
            setScreen('paused');
            engineRef.current?.setMode('paused');
          }}
          onToggleMute={handleToggleMute}
          onCaptureHighlight={() => {
            void engineRef.current?.captureMidRunHighlight();
          }}
          onSteer={(dir) => engineRef.current?.triggerSteer(dir)}
          onJump={() => engineRef.current?.triggerJump()}
          onSlide={() => engineRef.current?.triggerSlide()}
        />
      )}

      {/* Pause Modal */}
      {screen === 'paused' && (
        <PauseModal
          level={currentCfg.level}
          onResume={() => {
            setScreen('playing');
            engineRef.current?.setMode('playing');
          }}
          onRestart={() => launchLevel(currentCfg.level)}
          onStore={() => openStore('paused')}
          onOptions={() => {
            setReturnScreen('paused');
            setScreen('options');
          }}
          onMenu={goToMenu}
        />
      )}

      {/* Level Complete / Game Over / Grand Victory */}
      {(screen === 'levelComplete' || screen === 'gameOver' || screen === 'victory') &&
        runResult && (
          <ResultModal
            result={runResult}
            levelHighScores={save.levelHighScores[runResult.level] || []}
            dailyQuests={save.dailyQuests}
            latestHighlight={latestHighlight}
            onWatchHighlight={(clipId) => {
              setViewerClipId(clipId);
              setReturnScreen(screen);
              setScreen('highlights');
            }}
            onClaimQuest={handleClaimQuest}
            onNextLevel={() => launchLevel(Math.min(TOTAL_LEVEL_COUNT, runResult.level + 1))}
            onRetry={() => launchLevel(runResult.level)}
            onStore={() => openStore('menu')}
            onMenu={goToMenu}
          />
        )}
    </div>
  );
}
