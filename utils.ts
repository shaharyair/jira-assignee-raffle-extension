import { render, h, Component } from "vue";

export const createVNodeAndRenderComponent = (
  component: Component,
  targetElement: HTMLElement,
  props = {}
): void => {
  const vNode = h(component, props);
  render(vNode, targetElement);
};

export const randomIntegerInRange = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
