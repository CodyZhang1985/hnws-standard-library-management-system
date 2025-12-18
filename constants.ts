import { GraphData, NodeStatus, NodeType, StandardDoc } from './types';

export const MOCK_GRAPH_DATA: GraphData = {
  nodes: [
    // --- 部门 (Departments) ---
    { id: 'd1', name: '工程部', type: NodeType.DEPT, status: NodeStatus.ACTIVE, description: '负责设施设备维护' },
    { id: 'd2', name: '安管部', type: NodeType.DEPT, status: NodeStatus.ACTIVE, description: '负责园区安全秩序' },
    { id: 'd3', name: '客服部', type: NodeType.DEPT, status: NodeStatus.ACTIVE, description: '负责客户服务与投诉' },
    { id: 'd4', name: '环境部', type: NodeType.DEPT, status: NodeStatus.ACTIVE, description: '负责清洁与绿化' },

    // --- 场景 (Scenes) ---
    { id: 'n1', name: '动火作业', type: NodeType.SCENE, status: NodeStatus.ACTIVE, description: '高风险动火作业的标准操作流程与安全规范。', publishDate: '2024-01-10', department: '工程部' },
    { id: 'n2', name: '访客接待', type: NodeType.SCENE, status: NodeStatus.ACTIVE, description: '外来人员访问的标准接待流程，含VIP接待。', publishDate: '2023-12-05', department: '客服部' },
    { id: 'n3', name: '装修巡检', type: NodeType.SCENE, status: NodeStatus.ACTIVE, description: '针对租户装修施工现场的定期检查。', publishDate: '2024-02-20', department: '安管部' },
    { id: 'n4', name: '台风应急', type: NodeType.SCENE, status: NodeStatus.ACTIVE, description: '台风预警期间的应急响应预案。', publishDate: '2023-08-15', department: '安管部' },
    { id: 'n5', name: '电梯困人', type: NodeType.SCENE, status: NodeStatus.ACTIVE, description: '电梯发生故障困人时的紧急救援流程。', publishDate: '2024-03-01', department: '工程部' },
    { id: 'n6', name: '货物放行', type: NodeType.SCENE, status: NodeStatus.ACTIVE, description: '租户大宗物品搬出园区的放行规定。', publishDate: '2023-11-11', department: '安管部' },
    { id: 'n7', name: '投诉处理', type: NodeType.SCENE, status: NodeStatus.ACTIVE, description: '客户投诉的接单、跟进与回访闭环。', publishDate: '2024-01-05', department: '客服部' },
    { id: 'n8', name: '临时用电', type: NodeType.SCENE, status: NodeStatus.ACTIVE, description: '施工单位临时接驳电源的管理规范。', publishDate: '2024-02-10', department: '工程部' },
    { id: 'n9', name: '消杀作业', type: NodeType.SCENE, status: NodeStatus.ACTIVE, description: '公共区域定期四害消杀作业流程。', publishDate: '2024-04-01', department: '环境部' },
    { id: 'n10', name: '高空作业', type: NodeType.SCENE, status: NodeStatus.ACTIVE, description: '2米以上高处作业的安全审批与防护。', publishDate: '2023-10-20', department: '工程部' },
    { id: 'n11', name: '失物招领', type: NodeType.SCENE, status: NodeStatus.ACTIVE, description: '园区内拾遗物品的登记与认领流程。', publishDate: '2023-09-01', department: '客服部' },

    // --- 制度 (SOPs) ---
    { id: 'sop1', name: '动火许可证管理办法', type: NodeType.SOP, status: NodeStatus.ACTIVE, content: '一级动火需总经理审批，二级动火需部门经理审批。', department: '安管部' },
    { id: 'sop2', name: '访客实名登记制', type: NodeType.SOP, status: NodeStatus.ACTIVE, content: '必须人证合一，系统录入。', department: '安管部' },
    { id: 'sop3', name: '装修管理手册 v3.0', type: NodeType.SOP, status: NodeStatus.ACTIVE, content: '包含材料进出、施工时间、噪音控制等规定。', department: '工程部' },
    { id: 'sop4', name: '电梯安全运行规范', type: NodeType.SOP, status: NodeStatus.ACTIVE, content: '维保单位需半月一检。', department: '工程部' },
    { id: 'sop5', name: '客户服务首问责任制', type: NodeType.SOP, status: NodeStatus.ACTIVE, content: '首位接待员工需负责到底，不得推诿。', department: '客服部' },
    { id: 'sop6', name: '临时用电安全规范', type: NodeType.SOP, status: NodeStatus.ACTIVE, content: '必须使用三级配电箱，一机一闸一保护。', department: '工程部' },
    
    // --- 表格 (Tables) ---
    { 
      id: 't1', name: '动火作业申请表', type: NodeType.TABLE, status: NodeStatus.ACTIVE, publishDate: '2024-01-01', department: '安管部',
      fields: [
        { name: '申请单位', required: true, description: '填写施工单位全称', example: 'xx 装饰工程有限公司' },
        { name: '动火部位', required: true, description: '具体到楼层、房间号', example: 'A座 1205 室' },
        { name: '动火人/证号', required: true, description: '必须持有特种作业操作证', example: '张三 / T320...' },
        { name: '现场监护人', required: true, description: '施工方指派的安全监护人', example: '李四' },
        { name: '备注', required: false, description: '特殊情况说明', example: '需关闭烟感' }
      ]
    },
    { 
      id: 't2', name: '访客登记表', type: NodeType.TABLE, status: NodeStatus.ACTIVE, publishDate: '2023-05-01', department: '安管部',
      fields: [
        { name: '访客姓名', required: true, description: '与身份证一致', example: '王五' },
        { name: '被访人', required: true, description: '被访员工姓名', example: '赵六' },
        { name: '来访事由', required: true, description: '如：面试、送货、商务会议', example: '商务洽谈' },
        { name: '车牌号', required: false, description: '如有开车请登记，以便录入停车系统', example: '粤B 12345' }
      ]
    },
    { 
      id: 't3', name: '设施报修单', type: NodeType.TABLE, status: NodeStatus.ACTIVE, publishDate: '2024-02-15', department: '客服部',
      fields: [
        { name: '报修位置', required: true, description: '故障发生的具体地点', example: 'B座大堂男厕' },
        { name: '故障描述', required: true, description: '简要描述故障现象', example: '洗手盆水龙头漏水' },
        { name: '报修人', required: true, description: '发现人姓名', example: '巡逻岗A' },
        { name: '图片附件', required: false, description: '现场照片', example: '' }
      ]
    },
    { 
      id: 't4', name: '物品放行条', type: NodeType.TABLE, status: NodeStatus.ACTIVE, publishDate: '2023-11-01', department: '客服部',
      fields: [
        { name: '物品清单', required: true, description: '列明物品名称及数量', example: '电脑主机 x 2' },
        { name: '搬出单位', required: true, description: '租户名称', example: 'xx 科技' },
        { name: '授权人签字', required: true, description: '租户行政负责人签字', example: '' }
      ]
    },
    { 
      id: 't5', name: '临时用电申请表', type: NodeType.TABLE, status: NodeStatus.ACTIVE, publishDate: '2024-02-01', department: '工程部',
      fields: [
        { name: '用电负荷', required: true, description: '预估总功率 (KW)', example: '15 KW' },
        { name: '使用时间', required: true, description: '起止时间', example: '2024-05-01 至 2024-05-05' },
        { name: '接驳点', required: true, description: '由工程部指定', example: '12楼强电井' }
      ]
    },
  ],
  links: [
    // Dept Links
    { source: 'd1', target: 'n1', relation: 'BELONGS_TO' },
    { source: 'd1', target: 'n5', relation: 'BELONGS_TO' },
    { source: 'd1', target: 'n8', relation: 'BELONGS_TO' },
    { source: 'd1', target: 'n10', relation: 'BELONGS_TO' },
    { source: 'd2', target: 'n3', relation: 'BELONGS_TO' },
    { source: 'd2', target: 'n4', relation: 'BELONGS_TO' },
    { source: 'd2', target: 'n6', relation: 'BELONGS_TO' },
    { source: 'd3', target: 'n2', relation: 'BELONGS_TO' },
    { source: 'd3', target: 'n7', relation: 'BELONGS_TO' },
    { source: 'd3', target: 'n11', relation: 'BELONGS_TO' },
    { source: 'd4', target: 'n9', relation: 'BELONGS_TO' },

    // Scene -> SOP/Table
    { source: 'n1', target: 'sop1', relation: 'GUIDES' },
    { source: 'n1', target: 't1', relation: 'REQUIRES' },
    
    { source: 'n2', target: 'sop2', relation: 'GUIDES' },
    { source: 'n2', target: 't2', relation: 'REQUIRES' },

    { source: 'n3', target: 'sop3', relation: 'GUIDES' },
    { source: 'n3', target: 't3', relation: 'REQUIRES' }, // 巡检发现问题可能需要报修

    { source: 'n5', target: 'sop4', relation: 'GUIDES' },
    { source: 'n5', target: 't3', relation: 'REQUIRES' }, // 困人后需报修

    { source: 'n6', target: 't4', relation: 'REQUIRES' },
    { source: 'n6', target: 'sop2', relation: 'GUIDES' }, // 物品放行可能涉及人员进出

    { source: 'n7', target: 'sop5', relation: 'GUIDES' },
    
    { source: 'n8', target: 'sop6', relation: 'GUIDES' },
    { source: 'n8', target: 't5', relation: 'REQUIRES' },

    { source: 'n10', target: 't1', relation: 'REQUIRES' }, // 高空可能涉及动火，演示复杂关联
    { source: 'n10', target: 'sop1', relation: 'GUIDES' },

    // Cross Dept
    { source: 'sop3', target: 'n8', relation: 'GUIDES' }, // 装修包含临时用电
    { source: 'd2', target: 't1', relation: 'BELONGS_TO' }, // 动火申请表归安管监管
  ]
};

export const HOT_TOPICS = [
  '访客停车优惠如何办理',
  '洗手间漏水处理流程',
  '失物招领处位置',
  '电梯困人应急处置',
  '消防主机误报复位',
  '货梯开放时间规定',
  '加班空调申请流程'
];

export const MOCK_ADMIN_DOCS: StandardDoc[] = [
  {
    id: 'doc1',
    title: '动火作业安全管理规范',
    version: 'v2.1',
    lastUpdated: '2024-03-01',
    status: NodeStatus.ACTIVE,
    type: NodeType.SOP,
    department: '安管部',
    content: `1. 目的
为加强园区动火作业的安全管理，防止火灾事故发生，保障生命财产安全，特制定本规范。

2. 适用范围
本规范适用于园区内所有新建、改建、扩建、装修、设施设备维修等涉及动火作业的管理。

3. 定义
动火作业：在禁火区进行焊接与切割、加热、打磨以及在易燃易爆场所使用电钻、砂轮等可能产生火焰、火花和炽热表面的临时性作业。

4. 职责
4.1 工程部：负责动火作业的技术审批和现场安全监管。
4.2 安管部：负责动火作业的最终审批、办理《动火许可证》及现场消防监督。
4.3 施工单位：负责落实动火作业的安全措施，指派监护人。

5. 动火分级
5.1 一级动火：在重点要害部位（如配电房、发电机房、油库等）进行的动火作业。
5.2 二级动火：除一级动火以外的公共区域、办公区域等场所的动火作业。

6. 审批流程
6.1 申请：施工单位在作业前24小时填写《动火作业申请表》，并附上作业方案和安全措施。
6.2 现场勘查：工程部主管和安管部消防专员到现场进行勘查，确认具备安全作业条件。
6.3 审批：
   - 二级动火：由安管部经理审批。
   - 一级动火：由物业总经理审批。
6.4 发证：审批通过后，安管部签发《动火许可证》，有效期不超过24小时。

7. 现场安全要求
7.1 “八不”、“四要”、“一清”：
   - 动火人员必须持有有效特种作业操作证（焊工证）。
   - 现场必须配备至少2具4kg ABC干粉灭火器。
   - 动火点周围10米范围内不得有易燃易爆物品。
   - 高空动火必须采取接火措施（如使用接火斗或防火毯）。
   - 动火作业期间，施工单位必须指派专人进行全程监护，不得擅自离开。
   - 作业结束后，必须清理现场，确认无残留火种，监护人观察30分钟后方可离开。

8. 违规处理
凡违反本规范进行动火作业的，物业中心有权责令立即停止作业，并根据《装修管理手册》进行处罚；造成事故的，移交司法机关处理。`,
    history: [
      {
        version: 'v2.0',
        date: '2023-01-15',
        changes: '增加了现场监护人要求',
        diffContent: {
          original: '动火作业需配备至少一名灭火器。\n现场需有监护人。',
          modified: '动火作业需配备至少两名灭火器（4kg干粉）。\n现场必须有持证安全监护人全程在场，不得擅自离开。'
        }
      }
    ]
  },
  {
    id: 'doc2',
    title: '访客接待管理办法',
    version: 'v3.0',
    lastUpdated: '2024-05-10',
    status: NodeStatus.DRAFT,
    type: NodeType.SOP,
    department: '客服部',
    content: `1. 总则
为维护园区良好的办公秩序和安全环境，规范外来人员来访接待流程，展现园区良好形象，特制定本办法。

2. 访客分类
2.1 预约访客：已通过园区APP或企业微信预约的来访人员。
2.2 临时访客：未预约直接到访的人员。
2.3 VIP访客：重要客户、政府领导、集团高层等。

3. 接待流程
3.1 预约访客：
   - 到达大堂前台，出示预约二维码或告知手机号。
   - 客服人员核对系统信息，无误后发放/激活访客卡（或授权人脸识别）。
   - 指引访客通过闸机进入电梯厅。
3.2 临时访客：
   - 必须出示本人有效身份证件（身份证、护照、驾照）。
   - 客服人员联系被访人确认。
   - 确认无误后，进行实名登记（扫描身份证）。
   - 现场拍照录入人脸识别系统，授权相应楼层权限。
   - 发放访客凭证，指引进入。
3.3 VIP访客：
   - 接到通知后，客服主管需提前5分钟到指定位置迎候。
   - 开启VIP通道，免登记快速通行。
   - 专人引导至电梯或会议室，并提供茶水服务。

4. 车辆管理
4.1 访客车辆凭预约信息或被访公司确认单进入地下停车场。
4.2 停放至临时停车区（B2层 F区-G区）。
4.3 离开时凭停车票或电子优惠券减免停车费。

5. 物品携带
5.1 严禁携带易燃易爆、管制刀具、剧毒腐蚀性等危险物品进入园区。
5.2 携带大件物品离开时，须出示《物品放行条》，经安保人员核验后放行。

6. 附则
本办法自发布之日起执行，由客服部负责解释。`,
    history: [
      {
        version: 'v2.5',
        date: '2023-11-20',
        changes: '修订了隐私保护条款',
        diffContent: {
          original: '访客需登记姓名、手机号、身份证号。\n所有信息保留1年。',
          modified: '访客需登记姓名、手机号，身份证号仅做核验不留存。\n敏感信息保留期限调整为3个月，过期自动脱敏。'
        }
      }
    ]
  },
  {
    id: 'doc3',
    title: '装修巡检标准表',
    version: 'v1.5',
    lastUpdated: '2023-09-01',
    status: NodeStatus.LEGACY,
    type: NodeType.TABLE,
    department: '工程部',
    content: `表格名称：装修日常巡检记录表
编号：FORM-ENG-005
适用部门：工程部、安管部

检查项目与标准：
1. 证件检查：
   - 施工许可证是否张贴在显眼位置？
   - 现场人员是否佩戴出入证？人证是否相符？

2. 消防安全：
   - 现场是否配备足量灭火器（每50平米不少于2具）？
   - 是否有违规动火现象？
   - 消防栓、烟感、喷淋是否被遮挡或损坏？
   - 易燃材料是否分类堆放？

3. 用电安全：
   - 临时用电是否使用三级配电箱？
   - 电缆是否拖地？是否有破损？
   - 是否有违规使用大功率电器（热得快、电炉等）？

4. 施工规范：
   - 墙体拆除是否符合审批图纸？
   - 是否有违规打凿承重墙？
   - 地面防水是否进行闭水试验？

5. 文明施工：
   - 施工垃圾是否袋装并及时清理？
   - 施工噪音是否在规定时间内（8:00-12:00, 14:00-18:00）？
   - 现场是否有吸烟现象？
   - 公共区域（走廊、电梯厅）是否有污染？

备注：
- 巡检频次：每日至少2次。
- 发现问题需拍照留存，并开具《整改通知单》。`,
  }
];