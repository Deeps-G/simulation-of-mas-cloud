let chart;

function runSystem(){

fetch("http://127.0.0.1:8000/run-system")

.then(res => res.json())

.then(data => {

document.getElementById("scaleUp").innerText = data.scale_up
document.getElementById("scaleDown").innerText = data.scale_down
document.getElementById("maintain").innerText = data.maintain

updateChart(data)
generateAgentLogs(data)
updateCPUChart()

})

}

function updateChart(data){

const ctx = document.getElementById("decisionChart")

if(chart) chart.destroy()

chart = new Chart(ctx, {

type:'bar',

data:{
labels:["Scale Up","Scale Down","Maintain"],
datasets:[{
label:"Agent Decisions",
data:[data.scale_up,data.scale_down,data.maintain],
backgroundColor:[
"#22c55e",
"#ef4444",
"#3b82f6"
]
}]
}

})

}


function generateAgentLogs(data){

const log = document.getElementById("logList")

log.innerHTML = ""

const logs = [

"Monitoring Agent → Collected CPU metrics",
"Analysis Agent → Detected workload pattern",
"Prediction Agent → Predicted CPU usage",
"Performance Agent → Recommended scaling",
"Cost Agent → Evaluated infrastructure cost",
"Decision Agent → Balanced performance and cost"

]

logs.forEach(text=>{
let li = document.createElement("li")
li.innerText = text
log.appendChild(li)
})

}


let cpuChart

function updateCPUChart(){

const ctx = document.getElementById("cpuChart")

const data = Array.from({length:10}, ()=>Math.random()*100)

if(cpuChart) cpuChart.destroy()

cpuChart = new Chart(ctx,{
type:"line",
data:{
labels:["t1","t2","t3","t4","t5","t6","t7","t8","t9","t10"],
datasets:[{
label:"CPU Usage %",
data:data,
borderColor:"#22c55e",
backgroundColor:"rgba(34,197,94,0.2)",
tension:0.4
}]
},
options:{
responsive:true,
plugins:{
legend:{display:true}
},
scales:{
y:{
min:0,
max:100
}
}
}
})

}