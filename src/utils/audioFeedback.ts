/**
 * Utilitário de áudio para emissão de feedback sonoro do scanner AvaliaScan OMR.
 */

export const playThreeLoudBeeps = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    // Compressor de áudio para garantir volume alto sem distorção ou estalos
    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-10, audioCtx.currentTime);
    compressor.knee.setValueAtTime(30, audioCtx.currentTime);
    compressor.ratio.setValueAtTime(10, audioCtx.currentTime);
    compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
    compressor.release.setValueAtTime(0.25, audioCtx.currentTime);
    compressor.connect(audioCtx.destination);

    // 3 Bips consecutivos altos e nítidos (estilo leitor de código de barras/OMR de alta velocidade)
    const beeps = [
      { delay: 0.00, freq: 1046.5, duration: 0.11 }, // Bip 1 (C6)
      { delay: 0.17, freq: 1046.5, duration: 0.11 }, // Bip 2 (C6)
      { delay: 0.34, freq: 1250.0, duration: 0.15 }, // Bip 3 (Confirmação aguda)
    ];

    beeps.forEach(({ delay, freq, duration }) => {
      const startTime = audioCtx.currentTime + delay;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Volume alto (0.8)
      gain.gain.setValueAtTime(0.8, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(compressor);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch (err) {
    console.warn('Não foi possível emitir o som do scanner:', err);
  }
};

/**
 * Emite sinal sonoro suave e nítido de alvo/folha detectada no campo de visão do leitor.
 * Toque ascendente elegante (E5 -> A5) que indica enquadramento óptico bem-sucedido.
 */
export const playSheetDetectedTone = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const tones = [
      { delay: 0.00, freq: 659.25, duration: 0.08 }, // E5
      { delay: 0.07, freq: 880.00, duration: 0.14 }, // A5
    ];

    tones.forEach(({ delay, freq, duration }) => {
      const startTime = audioCtx.currentTime + delay;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Volume agradável e audível
      gain.gain.setValueAtTime(0.45, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch (err) {
    console.warn('Não foi possível emitir o tom de detecção da folha:', err);
  }
};

/**
 * Emite um beep longo e contínuo (~650ms) indicando que o enquadramento e o foco ideais
 * foram alcançados e o quadro foi congelado com sucesso para acionamento da leitura.
 */
export const playLongBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const startTime = audioCtx.currentTime;
    const duration = 0.65; // 650ms beep longo
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    // Tom nítido de confirmação em 880Hz (A5)
    osc.frequency.setValueAtTime(880, startTime);

    // Volume constante e firme com envelope suave nas pontas
    gain.gain.setValueAtTime(0.01, startTime);
    gain.gain.exponentialRampToValueAtTime(0.70, startTime + 0.04);
    gain.gain.setValueAtTime(0.70, startTime + duration - 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  } catch (err) {
    console.warn('Não foi possível emitir o beep longo de foco ideal:', err);
  }
};

