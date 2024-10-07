import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as turf from '@turf/turf';
import './App.css'; 


// 设置Mapbox访问令牌
mapboxgl.accessToken = 'your token';

const App = () => {
  const mapContainerRef = useRef(null);
  const [routeData, setRouteData] = useState(null);  // 存储route.json数据

  const [types, setTypes] = useState([]); // 存储不同的type种类
  const [showDirections, setShowDirections] = useState(false); // 控制路径导航组件的显示
  const [isSelectingStart, setIsSelectingStart] = useState(false); // 是否正在选择起点
  const [isSelectingEnd, setIsSelectingEnd] = useState(false); // 是否正在选择终点
  const [startPoint, setStartPoint] = useState(null); // 起点坐标
  const [startName, setStartName] = useState(null); // 起点
  const [endPoint, setEndPoint] = useState(null); // 终点坐标
  const [endName, setEndName] = useState(null); // 起点
  const mapRef = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const [graph, setGraph] = useState({});



  useEffect(() => {
    var map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-zh-v1', 
      center: [114.129, 22.583], 
      zoom: 18, 
    });

    map.on('load', () => {
      map.loadImage('/arrow-icon.png', (error, image) => {
        if (error) throw error;
        map.addImage('arrow-icon', image);
      });
    });


    map.setStyle('mapbox://styles/mapbox/streets-zh-v1', {
      localIdeographFontFamily: "'Noto Sans CJK SC', sans-serif" 
    });


    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    mapRef.current = map;

    mapRef.current.on('style.load', () => {
    fetch('/THC.json') 
      .then((response) => response.json())
      .then((data) => {
        const typeSet = new Set(); 
        data.features.forEach((feature) => {
          const featureType = feature.properties.type;
          if (featureType) {
            typeSet.add(featureType); 
          }
        });

        setTypes([...typeSet]);
        map.addSource('polygon', {
          type: 'geojson',
          data: data,
        });


        map.addLayer({
          id: 'extruded-polygon-layer',
          type: 'fill-extrusion',
          source: 'polygon',
          paint: {
            'fill-extrusion-color': [
              'match',
              ['get', 'type'],
              '商铺', '#acb2e7',
              '围墙', '#E6E6FA',
              '地板', '#bad2e0',
              '电梯', '#c9cbc9',
              '其他', '#B0C4DE',
              '扶梯', '#AFEEEE',
              '楼梯', '#F0E68C',
              '卫生间', '#FFE4E1',
              '停车位', '#aad0aa',
              '#FFFFFF' 
            ],
            'fill-extrusion-height': [
              'case',
              ['==', ['get', 'type'], '地板'], 0, // 地板高度为0
              2 // 其他类型高度为2米
            ],
            'fill-extrusion-opacity': 0.8, // 填充透明度
          },
        });

        map.addLayer({
          id: 'shop-outline-layer',
          type: 'line',
          source: 'polygon',
          filter: ['==', ['get', 'type'], '商铺'],  // 仅对商铺类型应用
          paint: {
            'line-color': 'rgba(169,169,169,0.5)',  // 使用淡灰色，透明度为0.5 (淡化轮廓)
            'line-width': 1.5,                      // 轮廓线宽度
            'line-opacity': 0.8                     // 轮廓线透明度
          },
          layout: {
            'line-join': 'round', 
            'line-cap': 'round'    
          }
        });
        map.addLayer({
          id: 'elevator-outline-layer',
          type: 'line',
          source: 'polygon',
          filter: ['==', ['get', 'type'], '电梯'], 
          paint: {
            'line-color': 'rgba(169,169,169,0.5)',  
            'line-width': 1.5,                     
            'line-opacity': 0.8                    
          },
          layout: {
            'line-join': 'round',
            'line-cap': 'round'    
          }
        });

        map.addLayer({
          id: 'louti-outline-layer',
          type: 'line',
          source: 'polygon',
          filter: ['==', ['get', 'type'], '楼梯'],  
          paint: {
            'line-color': 'rgba(169,169,169,0.5)',  
            'line-width': 1.5,                      
            'line-opacity': 0.8                     
          },
          layout: {
            'line-join': 'round',  
            'line-cap': 'round'    
          }
        });







        // 加载电梯图标
        map.loadImage('/elevator.png', (error, image) => {
          if (error) throw error;
          map.addImage('elevator-icon', image); // 添加图标到地图

          // 添加符号图层显示电梯图标
          map.addLayer({
            id: 'elevator-layer',
            type: 'symbol',
            source: 'polygon',
            layout: {
              'icon-image': 'elevator-icon', // 使用电梯图标
              'icon-size': 0.04, // 图标大小
              'icon-anchor': 'center', // 图标锚点
            },
            filter: ['==', ['get', 'name'], '电梯'], // 只显示名字为"电梯"的图标
          });
        });

        // 加载楼梯图标
        map.loadImage('/louti.png', (error, image) => {
          if (error) throw error;
          map.addImage('stair-icon', image); // 添加楼梯图标

          // 添加符号图层显示楼梯图标
          map.addLayer({
            id: 'stair-layer',
            type: 'symbol',
            source: 'polygon',
            layout: {
              'icon-image': 'stair-icon', // 使用楼梯图标
              'icon-size': 0.04, // 图标大小
              'icon-anchor': 'center', // 图标锚点
            },
            filter: ['==', ['get', 'name'], '楼梯'], // 只显示名字为"楼梯"的图标
          });
        });

        // 加载扶梯图标
        map.loadImage('/escalator.png', (error, image) => {
          if (error) throw error;
          map.addImage('escalator-icon', image); // 添加扶梯图标

          // 添加符号图层显示扶梯图标
          map.addLayer({
            id: 'escalator-layer',
            type: 'symbol',
            source: 'polygon',
            layout: {
              'icon-image': 'escalator-icon', // 使用扶梯图标
              'icon-size': 0.08, // 图标大小
              'icon-anchor': 'center', // 图标锚点
            },
            filter: ['==', ['get', 'name'], '扶梯'], // 只显示名字为"扶梯"的图标
          });
        });

        // 加载卫生间图标
        map.loadImage('/WC.png', (error, image) => {
          if (error) throw error;
          map.addImage('WC-icon', image); // 添加扶梯图标

          
        });


        map.loadImage('/parking.png', (error, image) => {
          if (error) throw error;
          map.addImage('parking-icon', image); // 添加扶梯图标

          // 添加符号图层显示扶梯图标
          map.addLayer({
            id: 'parking-layer',
            type: 'symbol',
            source: 'polygon',
            layout: {
              'icon-image': 'parking-icon',     // 使用停车位图标
              'icon-size': 0.04,                // 图标大小
              'icon-anchor': 'center',          // 图标锚点在中心
              'text-field': ['concat', '停车位', ['get', 'name']],
              'text-size': 8,                  // 文本标签大小
              'text-anchor': 'top',             // 文本标签锚点在图标的上方
              'text-offset': [0, 0.8],          // 文本标签相对于图标的偏移（垂直向上偏移）
            },
            paint: {
              'text-color': '#000000',          // 文本颜色，黑色
            },
            filter: ['==', ['get', 'type'], '停车位'], // 只显示类型为"停车位"的图标和标签
          });
        });

        // 添加标签图层（不包括电梯、楼梯和扶梯）
        map.addLayer({
          id: 'label-layer',
          type: 'symbol',
          source: 'polygon',
          layout: {
            'text-field': ['get', 'name'], // 从属性中获取名称
            'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
            'text-size': 13, // 字体大小
            'text-anchor': 'center', // 文本锚点
            'text-offset': [0, 0], // 文本偏移
          },
          paint: {
            'text-color': '#000000', // 标签颜色
          },
          filter: ['all',
            ['!=', ['get', 'name'], '卫生间'], // 不显示名字为"电梯"的标签
            ['!=', ['get', 'name'], '电梯'], // 不显示名字为"电梯"的标签
            ['!=', ['get', 'name'], '楼梯'], // 不显示名字为"楼梯"的标签
            ['!=', ['get', 'name'], '扶梯']  // 不显示名字为"扶梯"的标签
          ],
        });

        // 添加符号图层显示扶梯图标
        map.addLayer({
          id: 'WC-layer',
          type: 'symbol',
          source: 'polygon',
          layout: {
            'icon-image': 'WC-icon',
            'icon-size': 0.25,
            'icon-anchor': 'center',         
            'text-field': '卫生间',
            'text-size': 8,                 
            'text-anchor': 'top',           
            'text-offset': [0, 0.8],          
          },
          paint: {
            'text-color': '#000000',          
          },
          filter: ['==', ['get', 'name'], '卫生间'], 
        });

      })
      .catch((error) => console.error('Error loading GeoJSON:', error));
    })


    // 清理地图实例
    return () => map.remove();
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
  
    const handleMapClick = (e) => {
      const features = mapRef.current.queryRenderedFeatures(e.point, {
        layers: ['extruded-polygon-layer'], 
      });
  
      if (features.length > 0) {
        const selectedFeature = features[0]; // 获取第一个特征
        const featureName = selectedFeature.properties.name; // 获取特征类型
        const geometry = selectedFeature.geometry;
  
        let centroid;
  
        if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
          // 使用 Turf.js 计算几何中心
          centroid = turf.centroid(geometry);
        } else {
          alert('不支持的几何类型');
          return;
        }
  
        // 获取计算出的中心点
        let [lng, lat] = centroid.geometry.coordinates;
  
        // 确保中心点在特征内部
        const point = turf.point([lng, lat]);
        const isInside = turf.booleanPointInPolygon(point, geometry);
  
        // 如果中心点不在多边形内，查找最近的边界点
        if (!isInside) {
          const nearest = turf.nearestPointOnLine(geometry, point);
          lng = nearest.geometry.coordinates[0];
          lat = nearest.geometry.coordinates[1];
        }
  
        if (isSelectingStart) {
          setStartName(featureName);
          setStartPoint([lng, lat]);
          setIsSelectingStart(false);
  
          // 添加起点标记
          if (startMarkerRef.current) {
            startMarkerRef.current.remove(); // 移除之前的起点标记
          }
          startMarkerRef.current = new mapboxgl.Marker({ color: 'red' })
            .setLngLat([lng, lat])
            .addTo(mapRef.current);
        } else if (isSelectingEnd) {
          setEndName(featureName);
          setEndPoint([lng, lat]);
          setIsSelectingEnd(false);
  
          // 添加终点标记
          if (endMarkerRef.current) {
            endMarkerRef.current.remove(); // 移除之前的终点标记
          }
          endMarkerRef.current = new mapboxgl.Marker({ color: 'blue' })
            .setLngLat([lng, lat])
            .addTo(mapRef.current);
        }
      } else {
        alert('未选择到任何特征');
      }
    };
  
    // 注册地图点击事件
    mapRef.current.on('click', handleMapClick);
  

    // Clean up event listener
    return () => {
      mapRef.current.off('click', handleMapClick); // Remove event listener
    };
  }, [isSelectingStart, isSelectingEnd]);


  //导航
 // 构建图的函数
// 构建图
const buildGraph = (edgeData) => {
  const graph = {};
  const coordCount = {};  // 记录每个坐标点的出现次数

  edgeData.features.forEach(feature => {
      const coords = feature.geometry.coordinates;  // 获取边的坐标
      const distance = feature.properties.distance;  // 获取边的距离

      // 起点和终点
      const start = coords[0].toString(); 
      const end = coords[coords.length - 1].toString();

      // 统计坐标点的出现次数
      coords.forEach(coord => {
          const coordKey = coord.toString();  // 将坐标转换为字符串
          coordCount[coordKey] = (coordCount[coordKey] || 0) + 1;
      });

      // 确保起点和终点存在于图中
      if (!graph[start]) graph[start] = [];
      if (!graph[end]) graph[end] = [];

      // 连接起点到终点，确保不重复连接
      if (!graph[start].some(neighbor => neighbor.node === end)) {
        graph[start].push({ node: end, weight: distance });
      }
      if (!graph[end].some(neighbor => neighbor.node === start)) {
        graph[end].push({ node: start, weight: distance });
      }
  });

  // 输出出现次数大于2次的坐标点
  console.log('出现超过两次的坐标点：');
  for (const coord in coordCount) {
      if (coordCount[coord] > 2) {
          console.log(`坐标 ${coord} 出现了 ${coordCount[coord]} 次`);
      }
  }

  return graph;
};

// 找到离给定坐标最近的节点
const findClosestNode = (nodes, point) => {
  let closestNode = null;
  let minDistance = Infinity;

  nodes.forEach(node => {
    const [lng, lat] = node.split(',').map(Number); // 将节点字符串解析为坐标
    const distance = turf.distance([lng, lat], point); // 使用Turf.js计算两点间的距离

    if (distance < minDistance) {
      closestNode = node;
      minDistance = distance;
    }
  });

  return closestNode;
};

class MinHeap {
  constructor() {
    this.nodes = [];
  }

  insert(node, priority) {
    this.nodes.push({ node, priority });
    this.bubbleUp();
  }

  bubbleUp() {
    let index = this.nodes.length - 1;
    const element = this.nodes[index];

    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.nodes[parentIndex];

      if (element.priority >= parent.priority) break;

      this.nodes[parentIndex] = element;
      this.nodes[index] = parent;
      index = parentIndex;
    }
  }

  extractMin() {
    if (this.nodes.length === 0) return null;

    const min = this.nodes[0];
    const end = this.nodes.pop();
    if (this.nodes.length > 0) {
      this.nodes[0] = end;
      this.sinkDown();
    }
    return min.node;
  }

  sinkDown() {
    let index = 0;
    const length = this.nodes.length;
    const element = this.nodes[0];

    while (true) {
      let leftChildIndex = 2 * index + 1;
      let rightChildIndex = 2 * index + 2;
      let leftChild, rightChild;
      let swap = null;

      if (leftChildIndex < length) {
        leftChild = this.nodes[leftChildIndex];
        if (leftChild.priority < element.priority) {
          swap = leftChildIndex;
        }
      }

      if (rightChildIndex < length) {
        rightChild = this.nodes[rightChildIndex];
        if (
          (swap === null && rightChild.priority < element.priority) ||
          (swap !== null && rightChild.priority < leftChild.priority)
        ) {
          swap = rightChildIndex;
        }
      }

      if (swap === null) break;

      this.nodes[index] = this.nodes[swap];
      this.nodes[swap] = element;
      index = swap;
    }
  }

  isEmpty() {
    return this.nodes.length === 0;
  }
}

const dijkstra = (graph, startNode, endNode) => {
  const distances = {};
  const previousNodes = {};
  const priorityQueue = new MinHeap();

  // 初始化所有节点的距离和前驱节点
  for (const node in graph) {
    distances[node] = Infinity;
    previousNodes[node] = null;
  }
  distances[startNode] = 0;
  priorityQueue.insert(startNode, 0);

  while (!priorityQueue.isEmpty()) {
    const currentNode = priorityQueue.extractMin();

    if (currentNode === endNode) {
      break; // 找到目标节点
    }

    graph[currentNode].forEach(neighbor => {
      const newDist = distances[currentNode] + neighbor.weight;
      if (newDist < distances[neighbor.node]) {
        distances[neighbor.node] = newDist;
        previousNodes[neighbor.node] = currentNode;
        priorityQueue.insert(neighbor.node, newDist);
      }
    });
  }

  // 构建路径
  const resultPath = [];
  let currentNode = endNode;
  while (currentNode) {
    resultPath.unshift(currentNode);
    currentNode = previousNodes[currentNode];
  }

  return { distance: distances[endNode] === Infinity ? null : distances[endNode], path: resultPath };
};

// 在组件挂载时读取 GeoJSON 数据并构建图
useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await fetch('/topedge.geojson');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const edgeData = await response.json();
      // 构建图
      const graph = buildGraph(edgeData);
      setGraph(graph);
    } catch (error) {
      console.error("Error fetching or processing data:", error);
    }
  };

  fetchData();
}, []);

// 在地图上绘制路径
const drawRoute = (path) => {
  const coordinates = path.map(coord => coord.split(',').map(Number));

  // 清除之前的路线图层和数据源
  if (mapRef.current.getSource('route')) {
    mapRef.current.removeLayer('route-pattern');  // 移除带箭头的路线图层
    mapRef.current.removeLayer('route');          // 移除蓝色路线图层
    mapRef.current.removeSource('route');         // 移除路线数据源
  }

  // 添加路线数据源
  mapRef.current.addSource('route', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: coordinates,
      },
    },
  });


  mapRef.current.addLayer({
    id: 'route',
    type: 'line',
    source: 'route',
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
    paint: {
      'line-color': '#007bff',     
      'line-width': 4,             
    },
  });

  // 加载箭头图标
  mapRef.current.loadImage('/arrow-icon.png', (error, image) => {
    if (error) throw error;
    mapRef.current.addImage('arrow-icon', image); // 添加箭头图标

    // 添加上层：带箭头的路线图案
    mapRef.current.addLayer({
      id: 'route-pattern',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
        'line-pattern': 'arrow-icon',
      },
      paint: {
        'line-width': 4,              
      },
    });

    // 开始动画效果
    animateArrowPattern();
  });
};

// 动画效果函数
const animateArrowPattern = () => {
  const dashArraySequence = [
    [0, 4, 3],
    [0.5, 4, 2.5],
    [1, 4, 2],
    [1.5, 4, 1.5],
    [2, 4, 1],
    [2.5, 4, 0.5],
    [3, 4, 0],
    [0, 0.5, 3, 3.5],
    [0, 1, 3, 3],
    [0, 1.5, 3, 2.5],
    [0, 2, 3, 2],
    [0, 2.5, 3, 1.5],
    [0, 3, 3, 1],
    [0, 3.5, 3, 0.5]
  ];

  let step = 0;

  function animateDashArray(timestamp) {
    // 获取新的步骤以更新线条样式
    const newStep = parseInt((timestamp / 50) % dashArraySequence.length);

    // 更新线条的虚线样式
    if (newStep !== step) {
      // 更新带箭头的线条图层的 dasharray
      mapRef.current.setPaintProperty(
        'route-pattern',
        'line-dasharray',
        dashArraySequence[step]
      );
      step = newStep;
    }

    // 循环请求下一个动画帧
    requestAnimationFrame(animateDashArray);
  }

  // 启动动画
  requestAnimationFrame(animateDashArray);
};

// 提交处理函数
const handleSubmit = () => {
  if (!graph || Object.keys(graph).length === 0) {
    alert("图数据未加载或为空");
    return;
  }

  if (!startPoint || !endPoint) {
    alert("请选择起点和终点！");
    return;
  }

  // 找到离用户选定的起点和终点最近的节点
  const startNode = findClosestNode(Object.keys(graph), startPoint);
  const endNode = findClosestNode(Object.keys(graph), endPoint);

  if (!startNode || !endNode) {
    alert("无法找到起点或终点的最近节点！");
    return;
  }

  // 使用Dijkstra算法计算路径
  const result = dijkstra(graph, startNode, endNode);
  console.log(result, 'result');

  // 在地图上绘制路径
  if (result.path.length > 0) {
    drawRoute(result.path);
  }


};


return (
  <div>
    <div ref={mapContainerRef} style={{ width: '100%', height: '100vh', position: 'relative' }} />

    {/* 路径导航按钮 */}
    <button onClick={() => setShowDirections(true)} className="nav-button">
      路径导航
    </button>

    {/* 路径导航组件 */}
    {showDirections && (
      <div className="directions-container">
        {/* 起点选择 */}
        <div className="row">
          <div className="circle red"></div>
          <span className="label-text">起点: {startName || ''}</span>
          <button
            onClick={() => {
              setIsSelectingStart(true);
              setIsSelectingEnd(false); // 停止选择终点
            }}
            className="select-button"
          >
            {'请选择起点'} {/* 始终显示这句话 */}
          </button>
        </div>
        {/* 终点选择 */}
        <div className="row">
          <div className="circle blue"></div>
          <span className="label-text">终点: {endName || ''}</span>
          <button
            onClick={() => {
              setIsSelectingEnd(true);
              setIsSelectingStart(false); // 停止选择起点
            }}
            className="select-button"
          >
            {'请选择终点'} {/* 始终显示这句话 */}
          </button>
        </div>
        {/* 提交按钮 */}
        <button
          onClick={handleSubmit} // 添加点击事件，调用 handleSubmit 函数
          className="submit-button"
        >
          提交
        </button>
      </div>
    )}
  </div>
);
};

export default App;

