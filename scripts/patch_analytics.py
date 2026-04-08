import re
path="/home/claude/projects/claudecodegrowice/app/analytics/page.tsx"
c=open(path).read()
IMPORT_OLD='from "@/lib/mockData";'
IMPORT_NEW=IMPORT_OLD+chr(10)+'import { useAnalyticsData } from "@/lib/hooks/useAnalyticsData";'
c=c.replace(IMPORT_OLD,IMPORT_NEW,1)
K_OLD="  const k = analyticsKPIs;"
K_NEW=["  const { data: analyticsData, loading: analyticsLoading } = useAnalyticsData()","","  const k = {","    revenue: analyticsData?.totalRevenue ?? 0,","    revenueAvgDay: analyticsData ? Math.round(analyticsData.totalRevenue / 30) : 0,","    appointments: analyticsData?.totalVisits ?? 0,","    appointmentsAvgDay: analyticsData ? Math.round(analyticsData.totalVisits / 30) : 0,","    conversionRate: 0,","    avgCheck: analyticsData?.avgCheck ?? 0,","    noShowCount: 0,","    noShowPercent: 0,","    messagesPerContact: analyticsData && analyticsData.totalClients > 0","      ? Math.round((analyticsData.totalMessages / analyticsData.totalClients) * 10) / 10","      : 0,","    retention: 0,","    avgResponseTime: â,","    offHoursAppointments: 0,","    timeSaved: 0,","    reactivated: analyticsData?.campaignRecipients ?? 0,","    incomingMessages: analyticsData?.totalMessages ?? 0,","    outgoingMessages: 0,","  }"]
K_NEW_STR=chr(10).join(K_NEW)
c=c.replace(K_OLD,K_NEW_STR,1)
open(path,"w").write(c)
print("analyticsKPIs left:", "analyticsKPIs" in c)
print("useAnalyticsData present:", "useAnalyticsData" in c)
print("analyticsLoading present:", "analyticsLoading" in c)
print("Done")
