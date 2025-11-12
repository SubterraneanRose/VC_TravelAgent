'use client';

import { useState, useRef, useEffect } from 'react';
import { Button, Space, Typography, message, Input, Alert } from 'antd';
import { AudioOutlined, StopOutlined, EditOutlined } from '@ant-design/icons';
import { SpeechRecognitionService } from '../lib/speech/recognition';

interface VoiceInputProps {
  onResult?: (text: string) => void; // 识别结果回调
  onError?: (error: Error) => void; // 错误回调
  disabled?: boolean; // 是否禁用
}

export default function VoiceInput({ onResult, onError, disabled = false }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualText, setManualText] = useState('');
  const hasShownErrorRef = useRef(false); // 使用 ref 防止重复弹窗（同步更新）
  const recognitionRef = useRef<SpeechRecognitionService | null>(null);

  useEffect(() => {
    // 检查浏览器支持
    if (!SpeechRecognitionService.isSupported()) {
      console.warn('浏览器不支持语音识别');
    }

    // 清理函数
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleStart = () => {
    if (!SpeechRecognitionService.isSupported()) {
      message.warning('您的浏览器不支持语音识别，请使用 Chrome、Edge 或 Safari 浏览器');
      if (onError) {
        onError(new Error('浏览器不支持语音识别'));
      }
      return;
    }

    try {
      setRecognizedText('');
      setIsRecording(true);
      hasShownErrorRef.current = false; // 重置错误状态

      const recognition = new SpeechRecognitionService({
        language: 'zh-CN',
        continuous: true,
        interimResults: true,
        onResult: (text, isFinal) => {
          setRecognizedText(text);
          if (isFinal && onResult) {
            onResult(text);
          }
        },
        onError: (error) => {
          setIsRecording(false);
          
          // 防止重复弹窗：只在第一次失败时显示详细错误
          if (hasShownErrorRef.current) {
            // 已经显示过错误，只记录到控制台，不弹窗
            console.warn('语音识别错误（已显示过提示）:', error.message);
            if (onError) {
              onError(error);
            }
            return;
          }
          
          // 标记已显示错误（同步更新）
          hasShownErrorRef.current = true;
          
          // 根据错误类型显示不同的提示（只显示一次）
          if (error.message.includes('网络连接失败')) {
            // 检查是否是 HTTPS 问题
            const isHttps = window.location.protocol === 'https:';
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            
            // 诊断信息
            console.error('语音识别网络错误诊断:', {
              protocol: window.location.protocol,
              hostname: window.location.hostname,
              isHttps,
              isLocalhost,
              userAgent: navigator.userAgent,
            });
            
            if (!isHttps && !isLocalhost) {
              message.error({
                content: '语音识别需要 HTTPS 连接。请使用 HTTPS 访问网站，或在本地开发环境中使用 localhost',
                duration: 6,
              });
            } else {
              // 即使是 localhost，也可能是网络问题（无法连接到 Google 语音识别服务）
              message.warning({
                content: (
                  <div>
                    <div style={{ marginBottom: 8 }}>语音识别连接失败</div>
                    <div style={{ fontSize: 12, marginBottom: 8 }}>
                      可能原因：无法连接到语音识别服务（Chrome 使用 Google 服务）、防火墙阻止或网络不稳定
                    </div>
                    <Button 
                      type="link" 
                      size="small" 
                      onClick={() => {
                        setShowManualInput(true);
                        message.destroy(); // 关闭当前提示
                      }}
                      style={{ padding: 0 }}
                    >
                      建议使用手动输入功能 →
                    </Button>
                  </div>
                ),
                duration: 8,
              });
            }
          } else if (error.message.includes('麦克风')) {
            message.error({
              content: error.message + '。请刷新页面后重新授权',
              duration: 5,
            });
          } else {
            message.error({
              content: error.message,
              duration: 4,
            });
          }
          
          if (onError) {
            onError(error);
          }
        },
        onEnd: () => {
          setIsRecording(false);
        },
      });

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error: any) {
      setIsRecording(false);
      if (!hasShownErrorRef.current) {
        message.error('启动语音识别失败: ' + (error.message || '未知错误'));
        hasShownErrorRef.current = true;
      }
      if (onError) {
        onError(error);
      }
    }
  };

  const handleStop = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    hasShownErrorRef.current = false; // 重置错误状态，允许下次尝试时重新显示错误
    
    // 如果有识别结果，触发回调
    if (recognizedText && onResult) {
      onResult(recognizedText);
    }
  };

  const handleManualSubmit = () => {
    if (manualText.trim()) {
      setRecognizedText(manualText);
      if (onResult) {
        onResult(manualText);
      }
      setShowManualInput(false);
      setManualText('');
      message.success('文本已提交');
    }
  };

  // 检查 HTTPS 和浏览器支持（服务端安全）
  const isHttps = typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const isSupported = typeof window !== 'undefined' && SpeechRecognitionService.isSupported();

  return (
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      <Space>
        {!isRecording ? (
          <Button
            type="primary"
            icon={<AudioOutlined />}
            onClick={handleStart}
            disabled={disabled || !isSupported || !isHttps}
          >
            开始语音输入
          </Button>
        ) : (
          <Button
            danger
            icon={<StopOutlined />}
            onClick={handleStop}
          >
            停止录音
          </Button>
        )}
        {!isSupported && (
          <Typography.Text type="warning" style={{ fontSize: 12 }}>
            （您的浏览器不支持语音识别，请使用 Chrome、Edge 或 Safari）
          </Typography.Text>
        )}
        {isSupported && !isHttps && (
          <Typography.Text type="warning" style={{ fontSize: 12 }}>
            （语音识别需要 HTTPS 连接，请使用 HTTPS 访问）
          </Typography.Text>
        )}
        {isSupported && isHttps && (
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => setShowManualInput(!showManualInput)}
          >
            {showManualInput ? '隐藏' : '手动输入'}
          </Button>
        )}
      </Space>
      
      {/* 手动输入文本 */}
      {showManualInput && (
        <Alert
          message="手动输入文本"
          description={
            <Space direction="vertical" size="small" style={{ width: '100%', marginTop: 8 }}>
              <Input.TextArea
                rows={3}
                placeholder="如果语音识别不可用，您可以在这里直接输入文本，例如：我想去日本东京，5天，预算1万元，喜欢美食和动漫"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                onPressEnter={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    handleManualSubmit();
                  }
                }}
              />
              <Button
                type="primary"
                size="small"
                onClick={handleManualSubmit}
                disabled={!manualText.trim()}
              >
                提交文本
              </Button>
            </Space>
          }
          type="info"
          closable
          onClose={() => {
            setShowManualInput(false);
            setManualText('');
          }}
          style={{ marginTop: 8 }}
        />
      )}
      
      {recognizedText && (
        <div style={{ padding: 8, background: '#f5f5f5', borderRadius: 4, minHeight: 40 }}>
          <Typography.Text>{recognizedText}</Typography.Text>
        </div>
      )}
    </Space>
  );
}

