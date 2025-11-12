'use client';

/**
 * 语音识别服务
 * 优先使用浏览器原生 Web Speech API，如果不支持则使用科大讯飞
 */

export interface SpeechRecognitionConfig {
  language?: string; // 语言代码，默认 'zh-CN'
  continuous?: boolean; // 是否连续识别，默认 true
  interimResults?: boolean; // 是否返回中间结果，默认 true
  onResult?: (text: string, isFinal: boolean) => void; // 识别结果回调
  onError?: (error: Error) => void; // 错误回调
  onStart?: () => void; // 开始识别回调
  onEnd?: () => void; // 结束识别回调
}

export class SpeechRecognitionService {
  private recognition: any = null;
  private config: SpeechRecognitionConfig;
  private isSupported = false;

  constructor(config: SpeechRecognitionConfig = {}) {
    this.config = {
      language: config.language || 'zh-CN',
      continuous: config.continuous !== false,
      interimResults: config.interimResults !== false,
      onResult: config.onResult,
      onError: config.onError,
      onStart: config.onStart,
      onEnd: config.onEnd,
    };

    this.initRecognition();
  }

  /**
   * 初始化语音识别
   */
  private initRecognition(): void {
    // 检查浏览器是否支持 Web Speech API
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.lang = this.config.language;
        this.recognition.continuous = this.config.continuous;
        this.recognition.interimResults = this.config.interimResults;

        // 设置事件处理器
        this.recognition.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          // 调用回调函数
          if (this.config.onResult) {
            const text = finalTranscript || interimTranscript;
            const isFinal = finalTranscript.length > 0;
            this.config.onResult(text, isFinal);
          }
        };

        this.recognition.onerror = (event: any) => {
          let errorMessage = `语音识别错误: ${event.error}`;
          
          // 根据错误类型提供更友好的提示
          switch (event.error) {
            case 'network':
              errorMessage = '网络连接失败。请检查：\n1. 确保网络连接正常\n2. 如果使用 HTTP，请切换到 HTTPS（Web Speech API 需要安全连接）\n3. 本地开发环境 localhost 不受此限制';
              break;
            case 'no-speech':
              errorMessage = '未检测到语音输入，请重新尝试';
              break;
            case 'audio-capture':
              errorMessage = '无法访问麦克风，请检查麦克风权限设置';
              break;
            case 'not-allowed':
              errorMessage = '麦克风权限被拒绝，请在浏览器设置中允许麦克风访问';
              break;
            case 'aborted':
              // 用户主动停止，不显示错误
              return;
            case 'service-not-allowed':
              errorMessage = '语音识别服务不可用，请稍后重试';
              break;
            default:
              errorMessage = `语音识别错误: ${event.error}`;
          }
          
          const error = new Error(errorMessage);
          if (this.config.onError) {
            this.config.onError(error);
          }
        };

        this.recognition.onstart = () => {
          if (this.config.onStart) {
            this.config.onStart();
          }
        };

        this.recognition.onend = () => {
          if (this.config.onEnd) {
            this.config.onEnd();
          }
        };

        this.isSupported = true;
      } catch (error: any) {
        console.error('初始化语音识别失败:', error);
        this.isSupported = false;
      }
    } else {
      this.isSupported = false;
    }
  }

  /**
   * 检查浏览器是否支持语音识别
   * 在服务端（SSR）时返回 false
   */
  static isSupported(): boolean {
    // 在服务端（SSR）时，window 不存在，返回 false
    if (typeof window === 'undefined') {
      return false;
    }
    return !!(
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition
    );
  }

  /**
   * 开始识别
   */
  start(): void {
    if (!this.isSupported) {
      const error = new Error('浏览器不支持语音识别，请使用 Chrome、Edge 或 Safari 浏览器');
      if (this.config.onError) {
        this.config.onError(error);
      } else {
        throw error;
      }
      return;
    }

    try {
      this.recognition.start();
    } catch (error: any) {
      const err = new Error('启动语音识别失败: ' + (error.message || '未知错误'));
      if (this.config.onError) {
        this.config.onError(err);
      } else {
        throw err;
      }
    }
  }

  /**
   * 停止识别
   */
  stop(): void {
    if (this.recognition && this.isSupported) {
      try {
        this.recognition.stop();
      } catch (error) {
        // 忽略停止时的错误
      }
    }
  }

  /**
   * 中止识别
   */
  abort(): void {
    if (this.recognition && this.isSupported) {
      try {
        this.recognition.abort();
      } catch (error) {
        // 忽略中止时的错误
      }
    }
  }

  /**
   * 检查是否正在识别
   */
  get recognizing(): boolean {
    return this.recognition && this.isSupported;
  }
}

