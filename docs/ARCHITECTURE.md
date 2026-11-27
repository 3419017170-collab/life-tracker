# 技术架构（拟定，待原型验证）
React + TypeScript + Vite：专业页面与应用壳；Phaser 3：等距场景、探索、动画；IndexedDB/Dexie：记录、存档、照片；ECharts：图表；Web Audio：音频；PWA：离线。
领域逻辑与UI/引擎分离；奖励账本幂等；配置化剧情、物件与收藏。数据版本化、事务迁移、完整备份（含图片和游戏状态）、CSV导出。无云同步，个人数据不提交GitHub。
V1键 life-feedback-v1；旧测试V2键 gk-light-v2。只读导入，保留原键；验证日期、单位、去重及重复导入。独立来源测试优先，跨来源通过备份迁移。V1 SW会删除其他同源缓存，禁止直接共用缓存命名；正式发布前验证隔离。保留main及旧文件。
建议新工程目录 gk-v2/（待构建验证），内部 src、assets、content、tests。公开仓库仅许可素材。禁止提交个人存档、照片、凭据。
