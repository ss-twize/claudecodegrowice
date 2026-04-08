path="/home/claude/projects/claudecodegrowice/app/analytics/page.tsx"
c=open(path).read()
OLD='        {/* Main KPI cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">'
NEW='        {/* Main KPI cards */}
        <div className={"grid grid-cols-2 xl:grid-cols-4 gap-4 transition-opacity" + (analyticsLoading ? " opacity-50" : "")}>'
c2=c.replace(OLD,NEW,1)
print("changed:",c!=c2)
open(path,"w").write(c2)
print("done")
