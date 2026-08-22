<template>
  <div class="home">
    <div class="hero">
      <h1>📚 教学管理平台</h1>
    </div>
    <div class="cards">
      <router-link to="/homework-check" class="card">
        <div class="card-icon">📋</div>
        <h3>作业提交情况统计</h3>
        <p>统计学生作业提交情况，支持多种导出格式</p>
      </router-link>
      <router-link to="/homework-submit/teacher" class="card">
        <div class="card-icon">👨‍🏫</div>
        <h3>作业提交（教师端）</h3>
        <p>发布作业、管理学生、批阅提交、导出报告</p>
      </router-link>
      <router-link to="/homework-submit/student" class="card">
        <div class="card-icon">👨‍🎓</div>
        <h3>作业提交（学生端）</h3>
        <p>登录查看作业列表，提交作业，查看批阅结果</p>
      </router-link>
      <router-link to="/attendance/teacher" class="card">
        <div class="card-icon">🎓</div>
        <h3>考勤管理（教师端）</h3>
        <p>管理花名册、设置截止时间、查看考勤统计、导出记录</p>
      </router-link>
      <router-link to="/attendance/student" class="card">
        <div class="card-icon">📋</div>
        <h3>考勤登记（学生端）</h3>
        <p>登记班级信息、设备使用情况和卫生状况</p>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.home { padding: 0; }
.hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white; text-align: center; padding: 60px 20px;
}
.hero h1 { font-size: 2.5rem; margin-bottom: 12px; }
.hero p { font-size: 1.1rem; opacity: 0.9; }
.cards {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px; padding: 30px; max-width: 1200px; margin: 0 auto;
}
.card {
  background: white; border-radius: 14px; padding: 28px; text-decoration: none;
  color: inherit; box-shadow: 0 4px 15px rgba(0,0,0,0.08); transition: all 0.3s;
  display: block;
}
.card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.15); }
.card-icon { font-size: 2.5rem; margin-bottom: 12px; }
.card h3 { font-size: 1.15rem; color: #333; margin-bottom: 8px; }
.card p { color: #666; font-size: 0.9rem; line-height: 1.6; }
</style>
