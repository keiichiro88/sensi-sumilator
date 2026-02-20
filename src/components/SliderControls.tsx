import React from 'react'

interface SliderControlsProps {
    phase: 'pre-puncture' | 'punctured' | 'advancing' | 'completed'
    innerOffset: number
    outerOffset: number
    onInnerChange: (value: number) => void
    onOuterChange: (value: number) => void
    onReset: () => void
}

/**
 * 穿刺後に表示されるスライダーUI
 * 内筒と外筒をそれぞれ独立に操作可能
 */
export default function SliderControls({
    phase,
    innerOffset,
    outerOffset,
    onInnerChange,
    onOuterChange,
    onReset,
}: SliderControlsProps) {
    if (phase === 'pre-puncture') return null

    return (
        <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-auto">
            {/* グラデーション背景 */}
            <div className="bg-gradient-to-t from-black/80 via-black/50 to-transparent pt-12 pb-6 px-4">

                {/* ステータス表示 */}
                <div className="text-center mb-4">
                    {phase === 'punctured' && (
                        <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-400/40 rounded-full px-4 py-1.5 backdrop-blur-sm">
                            <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
                            <span className="text-red-300 text-sm font-medium">逆血確認 - フラッシュバック</span>
                        </div>
                    )}
                    {phase === 'advancing' && (
                        <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/40 rounded-full px-4 py-1.5 backdrop-blur-sm">
                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                            <span className="text-blue-300 text-sm font-medium">外筒を進めてください</span>
                        </div>
                    )}
                    {phase === 'completed' && (
                        <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-400/40 rounded-full px-4 py-1.5 backdrop-blur-sm">
                            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                            <span className="text-green-300 text-sm font-medium">留置完了！</span>
                        </div>
                    )}
                </div>

                {/* スライダーコントロール */}
                <div className="max-w-md mx-auto space-y-4">
                    {/* 内筒スライダー */}
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-20">
                            <span className="text-xs text-gray-300 font-medium block">内筒</span>
                            <span className="text-[10px] text-gray-500">（金属針）</span>
                        </div>
                        <div className="flex-1 relative">
                            <input
                                type="range"
                                min={-3.5}
                                max={0}
                                step={0.01}
                                value={innerOffset}
                                onChange={(e) => onInnerChange(parseFloat(e.target.value))}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer
                  bg-gradient-to-r from-gray-600 to-gray-400
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-5
                  [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-white
                  [&::-webkit-slider-thumb]:shadow-lg
                  [&::-webkit-slider-thumb]:border-2
                  [&::-webkit-slider-thumb]:border-gray-300
                  [&::-webkit-slider-thumb]:cursor-pointer"
                                disabled={phase === 'completed'}
                            />
                        </div>
                        <div className="flex-shrink-0 w-10 text-right">
                            <span className="text-xs text-gray-400 font-mono">{Math.abs(innerOffset).toFixed(1)}</span>
                        </div>
                    </div>

                    {/* 外筒スライダー */}
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-20">
                            <span className="text-xs text-blue-300 font-medium block">外筒</span>
                            <span className="text-[10px] text-blue-500/70">（カテーテル）</span>
                        </div>
                        <div className="flex-1 relative">
                            <input
                                type="range"
                                min={0}
                                max={1.5}
                                step={0.01}
                                value={outerOffset}
                                onChange={(e) => onOuterChange(parseFloat(e.target.value))}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer
                  bg-gradient-to-r from-blue-800 to-blue-400
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-5
                  [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-blue-400
                  [&::-webkit-slider-thumb]:shadow-lg
                  [&::-webkit-slider-thumb]:shadow-blue-500/30
                  [&::-webkit-slider-thumb]:border-2
                  [&::-webkit-slider-thumb]:border-blue-200
                  [&::-webkit-slider-thumb]:cursor-pointer"
                                disabled={phase === 'completed'}
                            />
                        </div>
                        <div className="flex-shrink-0 w-10 text-right">
                            <span className="text-xs text-blue-400 font-mono">{outerOffset.toFixed(1)}</span>
                        </div>
                    </div>
                </div>

                {/* リセットボタン */}
                <div className="text-center mt-4">
                    <button
                        onClick={onReset}
                        className="px-6 py-2 rounded-full text-sm font-medium
              bg-white/10 hover:bg-white/20 text-white/70 hover:text-white
              border border-white/10 hover:border-white/20
              backdrop-blur-sm transition-all duration-200
              active:scale-95"
                    >
                        リセット
                    </button>
                </div>
            </div>
        </div>
    )
}
