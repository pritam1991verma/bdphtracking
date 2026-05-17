const fuelEntries =
  JSON.parse(localStorage.getItem('fuelEntries')) || []

const totalEntries =
  fuelEntries.length

let totalFuel = 0

fuelEntries.forEach(entry=>{

  totalFuel += Number(entry.fuel)

})

const averageFuel =
  totalEntries > 0
  ? (totalFuel / totalEntries).toFixed(2)
  : 0

document.getElementById('totalEntries')
.innerText = totalEntries

document.getElementById('totalFuel')
.innerText = totalFuel + ' L'

document.getElementById('averageFuel')
.innerText = averageFuel + ' L'

const labels = []
const fuelData = []

fuelEntries.forEach((entry,index)=>{

  labels.push('Entry ' + (index + 1))

  fuelData.push(entry.fuel)

})

const ctx =
  document.getElementById('fuelChart')

new Chart(ctx, {

  type:'line',

  data:{

    labels:labels,

    datasets:[{

      label:'Fuel Usage',

      data:fuelData,

      borderColor:'#00D4FF',

      backgroundColor:'rgba(0,212,255,0.2)',

      tension:0.4,

      fill:true
    }]
  },

  options:{

    responsive:true,

    plugins:{

      legend:{
        labels:{
          color:'white'
        }
      }
    },

    scales:{

      x:{
        ticks:{
          color:'white'
        }
      },

      y:{
        ticks:{
          color:'white'
        }
      }
    }
  }
})

const aiInsight =
  document.getElementById('aiInsight')

if(totalFuel > 500){

  aiInsight.innerHTML = `

    <h3>AI Operational Insight</h3>

    <p>
      Fuel consumption trend is increasing.
      AI recommends operational efficiency review.
    </p>

  `
}

else{

  aiInsight.innerHTML = `

    <h3>AI Operational Insight</h3>

    <p>
      Fuel usage pattern currently stable.
    </p>

  `
}
