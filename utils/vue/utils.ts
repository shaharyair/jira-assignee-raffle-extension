import { render, h, Component } from "vue";

export class VueUtils {
  static createVNodeAndRenderComponent = (component: Component, targetElement: HTMLElement, props = {}): void => {
    const vNode = h(component, props);
    render(vNode, targetElement);
  };
}
