<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { t } from '../i18n'

const props = defineProps<{
  modelValue: string
  options: string[]
  /** 允许留空（例如视觉模型留空表示沿用对话模型） */
  emptyLabel?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const CUSTOM = '__custom__'
const EMPTY = '__empty__'

/** 当前值不在候选列表里时，自动切到手动输入 */
const manual = ref(false)
watch(
  () => [props.modelValue, props.options] as const,
  ([value, options]) => {
    if (value && !options.includes(value)) manual.value = true
  },
  { immediate: true }
)

const selectValue = computed(() => {
  if (manual.value) return CUSTOM
  if (!props.modelValue) return props.emptyLabel ? EMPTY : ''
  return props.modelValue
})

function onSelect(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value === CUSTOM) {
    manual.value = true
    return
  }
  manual.value = false
  emit('update:modelValue', value === EMPTY ? '' : value)
}
</script>

<template>
  <div class="model-picker">
    <select class="select" :value="selectValue" @change="onSelect">
      <option v-if="emptyLabel" :value="EMPTY">{{ emptyLabel }}</option>
      <option v-else-if="!modelValue && !manual" value="" disabled>{{ t('settings.modelPicker.placeholder') }}</option>
      <option v-for="name in options" :key="name" :value="name">{{ name }}</option>
      <option :value="CUSTOM">{{ t('settings.modelPicker.manual') }}</option>
    </select>
    <input
      v-if="manual"
      class="input"
      :value="modelValue"
      :placeholder="t('settings.modelPicker.manualPlaceholder')"
      spellcheck="false"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value.trim())"
    />
  </div>
</template>

<style scoped>
.model-picker {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
