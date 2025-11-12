'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, Spin, Select, Space, Typography } from 'antd';
import { geocodeAddress } from '../lib/amap/geocoding';

interface Marker {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  type: 'spot' | 'food' | 'hotel' | 'transport';
  dayIndex?: number;
}

interface AmapViewProps {
  markers: Marker[];
  height?: number;
  defaultCenter?: [number, number];
  defaultZoom?: number;
}

declare global {
  interface Window {
    AMap: any;
  }
}

export default function AmapView({ 
  markers, 
  height = 400,
  defaultCenter = [116.397428, 39.90923], // 北京天安门默认中心
  defaultZoom = 13
}: AmapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  // 加载高德地图 JS API
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_AMAP_API_KEY;
    
    if (!apiKey) {
      console.warn('高德地图 API Key 未配置');
      setLoading(false);
      return;
    }

    // 检查是否已加载
    if (window.AMap) {
      setMapLoaded(true);
      setLoading(false);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${apiKey}&callback=initAMap`;
    script.async = true;
    script.defer = true;

    (window as any).initAMap = () => {
      setMapLoaded(true);
      setLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      delete (window as any).initAMap;
    };
  }, []);

  // 计算地图中心点（根据标记点或默认值）
  const calculateCenter = (): [number, number] => {
    // 如果有标记点且有坐标，使用标记点的中心
    const validMarkers = markers.filter(m => m.lat && m.lng);
    if (validMarkers.length > 0) {
      const avgLat = validMarkers.reduce((sum, m) => sum + (m.lat || 0), 0) / validMarkers.length;
      const avgLng = validMarkers.reduce((sum, m) => sum + (m.lng || 0), 0) / validMarkers.length;
      return [avgLng, avgLat];
    }
    // 否则使用传入的默认中心
    return defaultCenter;
  };

  // 初始化地图（只初始化一次）
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !window.AMap || mapInstanceRef.current) return;

    try {
      // 初始使用默认中心，后续会根据标记点调整
      const map = new window.AMap.Map(mapRef.current, {
        zoom: defaultZoom,
        center: defaultCenter,
        viewMode: '3D',
      });

      mapInstanceRef.current = map;
      console.log('地图初始化成功');
    } catch (error) {
      console.error('地图初始化失败:', error);
    }
  }, [mapLoaded]);

  // 更新标记点
  useEffect(() => {
    if (!mapInstanceRef.current || !window.AMap) return;

    const map = mapInstanceRef.current;

    // 清除旧标记
    markersRef.current.forEach(marker => {
      map.remove(marker);
    });
    markersRef.current = [];

    // 过滤显示的标记（根据选择的日期）
    const filteredMarkers = selectedDay === 'all' 
      ? markers 
      : markers.filter(m => m.dayIndex === selectedDay);

    // 处理标记点（包括地理编码）
    const processMarkers = async () => {
      const markersToShow: Marker[] = [];
      
      console.log('开始处理标记点，总数:', filteredMarkers.length);
      console.log('原始标记点数据:', filteredMarkers.map(m => ({
        name: m.name,
        hasLat: !!m.lat,
        hasLng: !!m.lng,
        hasAddress: !!m.address,
        address: m.address,
      })));
      
      // 先处理所有已有坐标的标记点，并收集同一天的住宿地址作为备用
      const dayHotelAddresses = new Map<number, string>();
      for (const marker of filteredMarkers) {
        if (marker.lat && marker.lng) {
          // 已有坐标，直接使用
          console.log('标记点已有坐标:', marker.name, marker.lat, marker.lng);
          markersToShow.push(marker);
        } else if (marker.type === 'hotel' && marker.address) {
          // 收集住宿地址，用于后续模糊地址的备用
          if (marker.dayIndex !== undefined) {
            dayHotelAddresses.set(marker.dayIndex, marker.address);
          }
        }
      }

      // 处理需要地理编码的标记点（添加延迟以避免 API 限流）
      for (let i = 0; i < filteredMarkers.length; i++) {
        const marker = filteredMarkers[i];
        
        if (marker.lat && marker.lng) {
          // 已有坐标，跳过（已在上面处理）
          continue;
        } else if (marker.address) {
          // 没有坐标但有地址，尝试地理编码
          // 在每次请求之间添加延迟，避免超过并发量限制（高德地图地理编码服务并发量上限：3 次/秒）
          // 延迟 350ms 确保不超过 3 次/秒的限制（1000ms / 3 ≈ 333ms，设置为 350ms 更安全）
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 350)); // 延迟 350ms
          }
          
          console.log('尝试地理编码:', marker.name, marker.address);
          try {
            let coords = await geocodeAddress(marker.address);
            
            // 如果地理编码失败，且地址模糊（包含"内"、"或"、"周边"等），尝试使用同一天的住宿地址
            if (!coords && marker.dayIndex !== undefined) {
              const isVagueAddress = 
                (marker.address.includes('内') && marker.address.length < 15) ||
                marker.address.includes('或') ||
                marker.address.includes('周边');
              
              if (isVagueAddress) {
                const hotelAddress = dayHotelAddresses.get(marker.dayIndex);
                if (hotelAddress) {
                  console.log('使用同一天的住宿地址作为备用:', marker.name, '->', hotelAddress);
                  await new Promise(resolve => setTimeout(resolve, 350)); // 延迟后再请求（遵守 3 次/秒限制）
                  coords = await geocodeAddress(hotelAddress);
                }
              }
            }
            
            if (coords) {
              console.log('地理编码成功:', marker.name, coords);
              markersToShow.push({ ...marker, lat: coords.lat, lng: coords.lng });
            } else {
              // 静默失败，不输出警告（可能是外国城市或模糊地址，高德地图无法编码）
              // 只记录调试信息
              if (process.env.NODE_ENV === 'development') {
                console.debug('地理编码失败（可能是外国城市或模糊地址）:', marker.name, marker.address);
              }
            }
          } catch (error: any) {
            console.error('地理编码异常:', marker.name, marker.address, error.message);
          }
        } else {
          console.warn('标记点无坐标也无地址:', marker.name, marker);
        }
      }

      console.log('处理后的标记点数量:', markersToShow.length);

      if (markersToShow.length === 0) {
        console.warn('没有可显示的标记点');
        return;
      }

      // 创建标记点
      markersToShow.forEach((marker) => {
      const icon = getMarkerIcon(marker.type);
      
      const amapMarker = new window.AMap.Marker({
        position: [marker.lng!, marker.lat!],
        title: marker.name,
        icon: icon,
      });

      // 添加信息窗口
      const infoWindow = new window.AMap.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 4px;">${marker.name}</div>
            ${marker.address ? `<div style="color: #666; font-size: 12px;">${marker.address}</div>` : ''}
            <div style="margin-top: 8px;">
              <a href="https://uri.amap.com/navigation?to=${marker.lng},${marker.lat}&toname=${encodeURIComponent(marker.name)}&mode=car" 
                 target="_blank" 
                 style="color: #1890ff; text-decoration: none;">
                导航
              </a>
            </div>
          </div>
        `,
        offset: new window.AMap.Pixel(0, -30),
      });

      amapMarker.on('click', () => {
        infoWindow.open(map, amapMarker.getPosition());
      });

      map.add(amapMarker);
      markersRef.current.push(amapMarker);
    });

      // 调整地图视野以包含所有标记
      if (markersToShow.length > 0) {
        const lngs = markersToShow.map(m => m.lng!);
        const lats = markersToShow.map(m => m.lat!);
        
        if (markersToShow.length === 1) {
          // 只有一个标记点，直接定位
          map.setCenter([markersToShow[0].lng!, markersToShow[0].lat!]);
          map.setZoom(15);
        } else {
          // 多个标记点，使用边界框
          const bounds = new window.AMap.Bounds(
            new window.AMap.LngLat(Math.min(...lngs), Math.min(...lats)),
            new window.AMap.LngLat(Math.max(...lngs), Math.max(...lats))
          );
          
          // 添加一些边距
          map.setBounds(bounds, false, [20, 20, 20, 20]);
        }
        
        console.log('地图视野已调整，包含', markersToShow.length, '个标记点');
      } else {
        console.warn('没有标记点可显示，地图保持默认位置');
      }
    };

    processMarkers();
  }, [markers, selectedDay, mapLoaded]);

  const getMarkerIcon = (type: string) => {
    const colors: Record<string, string> = {
      spot: '#1890ff',    // 蓝色 - 景点
      food: '#ff7a00',    // 橙色 - 餐饮
      hotel: '#52c41a',   // 绿色 - 住宿
      transport: '#722ed1', // 紫色 - 交通
    };
    
    const color = colors[type] || '#1890ff';
    
    return new window.AMap.Icon({
      size: new window.AMap.Size(32, 32),
      image: `data:image/svg+xml;base64,${btoa(`
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="12" fill="${color}" stroke="white" stroke-width="2"/>
          <circle cx="16" cy="16" r="4" fill="white"/>
        </svg>
      `)}`,
      imageSize: new window.AMap.Size(32, 32),
    });
  };

  // 获取可选的日期列表
  const dayOptions = markers
    .map(m => m.dayIndex)
    .filter((day, index, arr) => day !== undefined && arr.indexOf(day) === index)
    .sort((a, b) => (a || 0) - (b || 0));

  if (!process.env.NEXT_PUBLIC_AMAP_API_KEY) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
          高德地图 API Key 未配置，请在 .env.local 中设置 NEXT_PUBLIC_AMAP_API_KEY
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="地图视图"
      extra={
        dayOptions.length > 0 && (
          <Space>
            <Select
              value={selectedDay}
              onChange={setSelectedDay}
              style={{ width: 120 }}
              options={[
                { label: '全部', value: 'all' },
                ...dayOptions.map(day => ({ label: `第 ${day} 天`, value: day })),
              ]}
            />
          </Space>
        )
      }
    >
      {loading ? (
        <div style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Spin size="large" />
          <Typography.Text type="secondary" style={{ marginTop: 16 }}>加载地图中...</Typography.Text>
        </div>
      ) : (
        <div ref={mapRef} style={{ width: '100%', height }} />
      )}
    </Card>
  );
}

