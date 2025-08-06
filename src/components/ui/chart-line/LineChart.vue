<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const props = defineProps({
  data: { type: Array, required: true },
  index: { type: String, required: true },
  categories: { type: Array, required: true },
  colors: { type: Array, default: () => ['#60a5fa', '#a78bfa'] }, // blue, purple
  yFormatter: { type: Function, default: (value) => value },
})

const chartData = computed(() => ({
  labels: props.data.map((item) => item[props.index]),
  datasets: props.categories.map((category, i) => ({
    label: category,
    data: props.data.map((item) => item[category]),
    backgroundColor: props.colors[i % props.colors.length],
    borderColor: props.colors[i % props.colors.length],
    tension: 0.1,
  })),
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
}
</script>

<template>
  <Line :data="chartData" :options="chartOptions" />
</template>
