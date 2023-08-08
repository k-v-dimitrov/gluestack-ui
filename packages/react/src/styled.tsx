/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-console */
import React, {
  // JSXElementConstructor,
  // Component,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  ConfigType,
  OrderedSXResolved,
  // Styled,
  StyleIds,
  // DefaultAndState,
  ComponentProps,
  UtilityProps,
  IdsStateColorMode,
  IVerbosedTheme,
  ITheme,
  ExtendedConfigType,
} from './types';
import {
  deepMerge,
  // deepMergeArray,
  getResolvedTokenValueFromConfig,
  deepMergeObjects,
  resolveStringToken,
} from './utils';
import { convertUtilityPropsToSX } from './core/convert-utility-to-sx';
import { useStyled } from './StyledProvider';
import { propertyTokenMap } from './propertyTokenMap';
import { Platform } from 'react-native';
import { INTERNAL_updateCSSStyleInOrderedResolved } from './updateCSSStyleInOrderedResolved';
import { generateStylePropsFromCSSIds } from './generateStylePropsFromCSSIds';

import { get, onChange } from './core/colorMode';
import {
  getComponentResolvedBaseStyle,
  getComponentResolvedVariantStyle,
  getDescendantResolvedBaseStyle,
  getDescendantResolvedVariantStyle,
} from './resolver/getComponentStyle';
import { styledResolvedToOrderedSXResolved } from './resolver/orderedResolved';
import { styledToStyledResolved } from './resolver/styledResolved';
import { getStyleIds } from './resolver/getStyleIds';
import { injectComponentAndDescendantStyles } from './resolver/injectComponentAndDescendantStyles';

import {
  convertStyledToStyledVerbosed,
  convertSxToSxVerbosed,
} from './convertSxToSxVerbosed';
import { stableHash } from './stableHash';
import { DeclarationType, GluestackStyleSheet } from './style-sheet';
// import { GluestackStyleSheet } from './style-sheet';

function isSubset(subset: any, set: any) {
  return subset.every((item: any) => set.includes(item));
}

function flattenObject(obj: any) {
  const flat: any = {};

  // Recursive function to flatten the object
  function flatten(obj: any, path: any = []) {
    // Iterate over the object's keys

    if (Array.isArray(obj)) {
      flat[`${path.join('.')}`] = obj;
    } else {
      for (const key of Object.keys(obj)) {
        // If the value is an object, recurse
        if (key === 'ids' && path.length > 0) {
          flat[`${path.join('.')}`] = obj[key];
        } else if (key === 'props') {
          flat[`${path.join('.')}.${key}`] = obj[key];
        } else if (typeof obj[key] === 'object') {
          flatten(obj[key], [...path, key]);
        } else {
          flat[`${path.join('.')}`] = obj[key];
        }
      }
    }
  }

  flatten(obj);
  return flat;
}

function convertUtiltiyToSXFromProps(
  componentProps: any,
  componentExtendedConfig: any,
  componentStyleConfig: any
) {
  const {
    sx: userSX,
    verboseSx: verboseSx,
    ...componentRestProps
  }: any = {
    ...componentProps,
  };

  const resolvedSXVerbosed = convertSxToSxVerbosed(userSX);

  const { sxProps: utilityResolvedSX, mergedProps: restProps } =
    convertUtilityPropsToSX(
      componentExtendedConfig,
      componentStyleConfig?.descendantStyle,
      componentRestProps
    );

  const resolvedSxVerbose = deepMerge(utilityResolvedSX, resolvedSXVerbosed);
  const sx = deepMerge(resolvedSxVerbose, verboseSx);
  return { sx, rest: restProps };
}

function getStateStyleCSSFromStyleIdsAndProps(
  styleIdObject: IdsStateColorMode,
  states: any,
  colorMode: any
) {
  const stateStyleCSSIds: Array<any> = [];
  let props = {};

  let stateColorMode: any = {};
  if (colorMode || (states && typeof states !== 'undefined')) {
    stateColorMode = {
      ...states,
      [colorMode]: true,
    };

    const flatternStyleIdObject = flattenObject(styleIdObject);

    Object.keys(flatternStyleIdObject).forEach((styleId) => {
      // console.log('jhasfgjhask', styleId);
      const styleIdKeyArray = styleId.split('.');

      const filteredStyleIdKeyArray = styleIdKeyArray.filter(
        (item) => item !== 'colorMode' && item !== 'state' && item !== 'props'
      );

      const currentStateArray = Object.keys(stateColorMode).filter(
        (key) => stateColorMode[key] === true
      );

      if (styleId.includes('ids')) {
        // if (type === 'inline' && ) {
        // stateStyleCSSIds.push(...flatternStyleIdObject[styleId]);
        // }
      } else if (
        styleId.includes('props') &&
        isSubset(filteredStyleIdKeyArray, currentStateArray)
      ) {
        props = deepMergeObjects(props, flatternStyleIdObject[styleId]);
      } else {
        if (isSubset(filteredStyleIdKeyArray, currentStateArray)) {
          stateStyleCSSIds.push(...flatternStyleIdObject[styleId]);
        }
      }
    });
  }

  return { cssIds: stateStyleCSSIds, passingProps: props };
}

export function resolveBuildTimeSx(
  userSX: any,
  verboseSx: any,
  utilityResolvedSX: any,
  componentExtendedConfig: any
) {
  const resolvedSXVerbosed = convertSxToSxVerbosed(userSX);
  const resolvedSxVerbose = deepMerge(utilityResolvedSX, resolvedSXVerbosed);
  const sx = deepMerge(resolvedSxVerbose, verboseSx);

  let STABLEHASH_sx = stableHash(sx);
  let orderedSXResolved: any = [];
  if (Object.keys(sx).length > 0) {
    const inlineSxTheme = {
      baseStyle: sx,
    };

    resolvePlatformTheme(inlineSxTheme, Platform.OS);
    const sxStyledResolved = styledToStyledResolved(
      // @ts-ignore
      inlineSxTheme,
      [],
      componentExtendedConfig
    );
    orderedSXResolved = styledResolvedToOrderedSXResolved(sxStyledResolved);
  }
  return {
    orderedSXResolved,
    STABLEHASH_sx,
  };
}

function isValidVariantCondition(condition: any, variants: any) {
  for (const key in condition) {
    if (!variants.hasOwnProperty(key) || variants[key] !== condition[key]) {
      return false;
    }
  }
  return true;
}

function getMergedDefaultCSSIdsAndProps(
  componentStyleIds: StyleIds,
  incomingVariantProps: any,
  theme: any,
  properties: any
) {
  // console.setStartTimeStamp('getMergedDefaultCSSIdsAndProps');

  let props: any = {};

  const baseStyleCSSIds: Array<string> = [];
  const variantStyleCSSIds: Array<string> = [];
  if (
    componentStyleIds &&
    componentStyleIds?.baseStyle &&
    componentStyleIds?.baseStyle?.ids
  ) {
    baseStyleCSSIds.push(...componentStyleIds?.baseStyle?.ids);
    props = deepMergeObjects(props, componentStyleIds?.baseStyle?.props);
  }
  let passingVariantProps = getVariantProps(props, theme).variantProps;

  const mergedVariantProps = {
    ...passingVariantProps,
    ...incomingVariantProps,
  };

  Object.keys(mergedVariantProps).forEach((variant) => {
    const variantName = mergedVariantProps[variant];

    if (
      variant &&
      componentStyleIds?.variants &&
      componentStyleIds?.variants[variant] &&
      componentStyleIds?.variants[variant]?.[variantName] &&
      componentStyleIds?.variants[variant]?.[variantName]?.ids
    ) {
      variantStyleCSSIds.push(
        //@ts-ignore
        ...componentStyleIds?.variants[variant]?.[variantName]?.ids
      );

      // if this variant exist in remaining props, remove it from remaining props
      if (properties[variant]) {
        delete properties[variant];
      }
      if (props[variant]) {
        delete props[variant];
      }
      props = deepMergeObjects(
        props,
        componentStyleIds?.variants[variant]?.[variantName]?.props
      );
    }
  });

  componentStyleIds?.compoundVariants.forEach((compoundVariant) => {
    if (
      isValidVariantCondition(compoundVariant.condition, mergedVariantProps)
    ) {
      if (compoundVariant.ids) {
        variantStyleCSSIds.push(
          //@ts-ignore
          ...compoundVariant.ids
        );
      }
      props = deepMergeObjects(props, compoundVariant?.props);
    }
  });
  // console.setEndTimeStamp('getMergedDefaultCSSIdsAndProps');

  return {
    baseStyleCSSIds: baseStyleCSSIds,
    variantStyleCSSIds: variantStyleCSSIds,
    passingProps: props,
  };
}

const getMergeDescendantsStyleCSSIdsAndPropsWithKey = (
  descendantStyles: any,
  variantProps: any,
  theme: any,
  properties: any
) => {
  // console.setStartTimeStamp('getMergeDescendantsStyleCSSIdsAndPropsWithKey');

  const descendantStyleObj: any = {};
  if (descendantStyles) {
    Object.keys(descendantStyles)?.forEach((key) => {
      const styleObj = descendantStyles[key];

      const {
        baseStyleCSSIds,
        variantStyleCSSIds,
        passingProps: defaultPassingProps,
      } = getMergedDefaultCSSIdsAndProps(
        styleObj,
        variantProps,
        theme,
        properties
      );
      descendantStyleObj[key] = {
        baseStyleCSSIds: baseStyleCSSIds,
        variantStyleCSSIds: variantStyleCSSIds,
        passingProps: defaultPassingProps,
      };
    });
  }
  // console.setEndTimeStamp('getMergeDescendantsStyleCSSIdsAndPropsWithKey');

  return descendantStyleObj;
};

const Context = React.createContext({});
//

// window['globalStyleMap'] = globalStyleMap;
// const globalOrderedList: any = [];
// setTimeout(() => {
//   const orderedList = globalOrderedList.sort(
//     (a: any, b: any) => a.meta.weight - b.meta.weight
//   );
//   injectInStyle(orderedList);
// });

function push_unique(arr: any, ele: any) {
  if (Array.isArray(arr)) {
    if (Array.isArray(ele)) {
      ele.forEach((element: any) => {
        if (!arr.includes(element)) {
          arr.push(element);
        }
      });
    } else {
      if (!arr.includes(ele)) {
        arr.push(ele);
      }
    }
  }

  return arr;
}

function getMergedStateAndColorModeCSSIdsAndProps(
  componentStyleIds: StyleIds,
  states: any,
  incomingVariantProps: any,
  COLOR_MODE: 'light' | 'dark',
  theme: any
) {
  // console.setStartTimeStamp('getMergedStateAndColorModeCSSIdsAndProps');

  // return {
  //   baseStyleCSSIds: [],
  //   variantStyleCSSIds: [],
  //   passingProps: {},
  // };
  const stateBaseStyleCSSIds: Array<string> = [];
  const stateVariantStyleCSSIds: Array<string> = [];
  let props = {};

  if (componentStyleIds.baseStyle) {
    const { cssIds: stateStleCSSFromStyleIds, passingProps: stateStyleProps } =
      getStateStyleCSSFromStyleIdsAndProps(
        componentStyleIds.baseStyle,
        states,
        COLOR_MODE
      );

    push_unique(stateBaseStyleCSSIds, stateStleCSSFromStyleIds);
    // stateBaseStyleCSSIds.push(...stateStleCSSFromStyleIds);
    props = deepMergeObjects(props, stateStyleProps);
  }

  let passingVariantProps = getVariantProps(props, theme).variantProps;

  const mergedVariantProps = {
    ...passingVariantProps,
    ...incomingVariantProps,
  };

  Object.keys(mergedVariantProps).forEach((variant) => {
    if (
      variant &&
      componentStyleIds.variants &&
      componentStyleIds.variants[variant] &&
      componentStyleIds.variants[variant][mergedVariantProps[variant]]
    ) {
      const {
        cssIds: stateStleCSSFromStyleIds,
        passingProps: stateStyleProps,
      } = getStateStyleCSSFromStyleIdsAndProps(
        componentStyleIds.variants[variant][mergedVariantProps[variant]],
        states,
        COLOR_MODE
      );

      push_unique(stateVariantStyleCSSIds, stateStleCSSFromStyleIds);
      // stateVariantStyleCSSIds.push(...stateStleCSSFromStyleIds);

      props = deepMergeObjects(props, stateStyleProps);
    }
  });

  componentStyleIds?.compoundVariants?.forEach((compoundVariant) => {
    if (
      isValidVariantCondition(compoundVariant.condition, mergedVariantProps)
    ) {
      const {
        cssIds: stateStleCSSFromStyleIds,
        passingProps: stateStyleProps,
      } = getStateStyleCSSFromStyleIdsAndProps(
        //@ts-ignore
        compoundVariant,
        states,
        COLOR_MODE
      );

      push_unique(stateVariantStyleCSSIds, stateStleCSSFromStyleIds);
      // stateVariantStyleCSSIds.push(...stateStleCSSFromStyleIds);

      props = deepMergeObjects(props, stateStyleProps);
    }
  });

  // console.setEndTimeStamp('getMergedStateAndColorModeCSSIdsAndProps');

  return {
    baseStyleCSSIds: stateBaseStyleCSSIds,
    variantStyleCSSIds: stateVariantStyleCSSIds,
    passingProps: props,
  };
}

function getAncestorCSSStyleIds(compConfig: any, context: any) {
  // console.setStartTimeStamp('getAncestorCSSStyleIds');

  let ancestorBaseStyleIds: any[] = [];
  let ancestorVariantStyleIds: any[] = [];
  let ancestorPassingProps: any = {};
  if (compConfig.ancestorStyle?.length > 0) {
    compConfig.ancestorStyle.forEach((ancestor: any) => {
      if (context[ancestor]) {
        ancestorBaseStyleIds = context[ancestor]?.baseStyleCSSIds;
        ancestorVariantStyleIds = context[ancestor]?.variantStyleCSSIds;
        ancestorPassingProps = context[ancestor]?.passingProps;
      }
    });
  }
  // console.setEndTimeStamp('getAncestorCSSStyleIds');

  return {
    baseStyleCSSIds: ancestorBaseStyleIds,
    variantStyleIds: ancestorVariantStyleIds,
    passingProps: ancestorPassingProps,
  };
}

function mergeArraysInObjects(...objects: any) {
  // console.setStartTimeStamp('mergeArraysInObjects');

  const merged: any = {};

  for (const object of objects) {
    Object.keys(object).forEach((key) => {
      const value = object[key];
      if (!merged[key]) {
        merged[key] = {
          baseStyleCSSIds: [],
          variantStyleCSSIds: [],
          passingProps: {},
        };
      }
      merged[key].baseStyleCSSIds.push(...value.baseStyleCSSIds);
      merged[key].variantStyleCSSIds.push(...value.variantStyleCSSIds);
      merged[key].passingProps = deepMergeObjects(
        merged[key].passingProps,
        value.passingProps
      );
    });
  }
  // console.setEndTimeStamp('mergeArraysInObjects');

  return merged;
}

// let resolvedComponentMap = new Map<Component, any>();

// function isAlreadyResolved(Component) {

// }
function resolvePlatformTheme(theme: any, platform: any) {
  // console.setStartTimeStamp('resolvePlatformTheme', 'boot');

  if (typeof theme === 'object') {
    Object.keys(theme).forEach((themeKey) => {
      if (themeKey !== 'style' && themeKey !== 'defaultProps') {
        if (theme[themeKey].platform) {
          let temp = { ...theme[themeKey] };
          theme[themeKey] = deepMerge(temp, theme[themeKey].platform[platform]);
          delete theme[themeKey].platform;
          resolvePlatformTheme(theme[themeKey], platform);
        } else if (themeKey === 'queries') {
          theme[themeKey].forEach((query: any) => {
            if (query.value.platform) {
              let temp = { ...query.value };
              query.value = deepMerge(temp, query.value.platform[platform]);
              delete query.value.platform;
            }
            resolvePlatformTheme(query.value, platform);
          });
        } else {
          resolvePlatformTheme(theme[themeKey], platform);
        }
      }
    });
  }
  // console.setEndTimeStamp('resolvePlatformTheme', 'boot');
}

export function getVariantProps(
  props: any,
  theme: any,
  shouldDeleteVariants: boolean = true
) {
  // console.setStartTimeStamp('getVariantProps');

  const variantTypes = theme?.variants ? Object.keys(theme.variants) : [];

  const restProps = { ...props };

  const variantProps: any = {};
  variantTypes?.forEach((variant) => {
    if (props.hasOwnProperty(variant)) {
      variantProps[variant] = props[variant];
      if (shouldDeleteVariants) delete restProps[variant];
    }
  });
  // console.setEndTimeStamp('getVariantProps');

  return {
    variantProps,
    restProps,
  };
}

// const styledResolved = styledToStyledResolved(theme, [], CONFIG);
// const orderedResovled = styledResolvedToOrderedSXResolved(styledResolved);

// INTERNAL_updateCSSStyleInOrderedResolved(orderedResovled);
// //set css ruleset
// globalOrderedList.push(...orderedResovled);

// // StyleIds
// const componentStyleIds = getComponentStyleIds(
//   orderedResovled.filter((item) => !item.meta.path?.includes('descendants'))
// );

// if (componentStyleConfig.DEBUG === 'INPUT') {
//   // console.log(componentStyleIds, 'hello state here >>');
// }

// // Descendants
// const descendantStyleIds = getDescendantStyleIds(
//   orderedResovled.filter((item) => item.meta.path?.includes('descendants')),
//   componentStyleConfig.descendantStyle
// );

//

// BASE COLOR MODE RESOLUTION

function updateOrderUnResolvedMap(
  theme: any,
  componentHash: string,
  declarationType: string,
  ExtendedConfig: any
) {
  const unresolvedTheme = styledToStyledResolved(theme, [], {}, false);
  const orderedUnResolvedTheme =
    styledResolvedToOrderedSXResolved(unresolvedTheme);

  INTERNAL_updateCSSStyleInOrderedResolved(
    orderedUnResolvedTheme,
    componentHash,
    true
  );

  const componentOrderResolvedBaseStyle = getComponentResolvedBaseStyle(
    orderedUnResolvedTheme
  );
  const componentOrderResolvedVariantStyle = getComponentResolvedVariantStyle(
    orderedUnResolvedTheme
  );

  const descendantOrderResolvedBaseStyle = getDescendantResolvedBaseStyle(
    orderedUnResolvedTheme
  );
  const descendantOrderResolvedVariantStyle = getDescendantResolvedVariantStyle(
    orderedUnResolvedTheme
  );

  GluestackStyleSheet.declare(
    componentOrderResolvedBaseStyle,
    declarationType + '-base',
    componentHash ? componentHash : 'css-injected-boot-time',
    ExtendedConfig
  );
  GluestackStyleSheet.declare(
    descendantOrderResolvedBaseStyle,
    declarationType + '-descendant-base',
    componentHash ? componentHash : 'css-injected-boot-time-descendant',
    ExtendedConfig
  );
  GluestackStyleSheet.declare(
    componentOrderResolvedVariantStyle,
    declarationType + '-variant',
    componentHash ? componentHash : 'css-injected-boot-time',
    ExtendedConfig
  );
  GluestackStyleSheet.declare(
    descendantOrderResolvedVariantStyle,
    declarationType + '-descendant-variant',
    componentHash ? componentHash : 'css-injected-boot-time-descendant',
    ExtendedConfig
  );

  return orderedUnResolvedTheme;
}

// END BASE COLOR MODE RESOLUTION

export function verboseStyled<P, Variants>(
  Component: React.ComponentType<P>,
  theme: Partial<IVerbosedTheme<Variants, P>>,
  componentStyleConfig: ConfigType = {},
  ExtendedConfig?: any,
  BUILD_TIME_PARAMS?: {
    orderedResolved: OrderedSXResolved;
    styleIds: {
      component: StyleIds;
      descendant: StyleIds;
    };
    themeHash?: string;
  }
) {
  const componentHash = stableHash({
    ...theme,
    ...componentStyleConfig,
    ...ExtendedConfig,
  });
  // const originalThemeHash = stableHash(theme);

  let declarationType: DeclarationType = 'boot';

  if (Component.displayName === '__AsForwarder__') {
    declarationType = 'forwarded';
  }

  resolvePlatformTheme(theme, Platform.OS);

  // GluestackStyleSheet.declare(
  //   declarationType,
  //   componentHash,
  //   originalThemeHash,
  //   theme,
  //   ExtendedConfig,
  //   componentStyleConfig
  // );

  const DEBUG_TAG = componentStyleConfig?.DEBUG;
  const DEBUG =
    process.env.NODE_ENV === 'development' && DEBUG_TAG ? false : false;

  if (DEBUG) {
    console.group(
      `%cVerboseStyled()`,
      'background: #4b5563; color: #d97706; font-weight: 700; padding: 2px 8px;'
    );
    console.log(
      `%c${DEBUG_TAG} verbosed theme`,
      'background: #4b5563; color: #16a34a; font-weight: 700; padding: 2px 8px;',
      theme
    );
  }

  //@ts-ignore
  type ITypeReactNativeStyles = P['style'];
  let styleHashCreated = false;
  let orderedResolved: OrderedSXResolved;
  let componentStyleIds: any = {};
  let componentDescendantStyleIds: any = {}; // StyleIds = {};
  let componentExtendedConfig: any = {};
  let styleIds = {} as {
    component: StyleIds;
    descendant: StyleIds;
  };

  // const orderedUnResolvedTheme = updateOrderUnResolvedMap(
  //   theme,
  //   componentHash,
  //   declarationType,
  //   ExtendedConfig
  // );

  // styleIds = getStyleIds(orderedUnResolvedTheme, componentStyleConfig);

  if (BUILD_TIME_PARAMS?.orderedResolved) {
    orderedResolved = BUILD_TIME_PARAMS?.orderedResolved;

    injectComponentAndDescendantStyles(orderedResolved, 'boot');
    if (DEBUG) {
      console.log(
        `%cOrder resolved build time`,
        'background: #4b5563; color: #16a34a; font-weight: 700; padding: 2px 8px;',
        orderedResolved
      );
    }
  } else {
    const orderedUnResolvedTheme = updateOrderUnResolvedMap(
      theme,
      componentHash,
      declarationType,
      ExtendedConfig
    );

    styleIds = getStyleIds(orderedUnResolvedTheme, componentStyleConfig);
  }

  if (BUILD_TIME_PARAMS?.styleIds) {
    styleIds = BUILD_TIME_PARAMS?.styleIds;
    if (DEBUG) {
      console.log(
        `%cStyle Ids build time`,
        'background: #4b5563; color: #16a34a; font-weight: 700; padding: 2px 8px;',
        styleIds
      );
    }
  }

  function injectSx(sx: any, type: any = 'inline') {
    const inlineSxTheme = {
      baseStyle: sx,
    };

    resolvePlatformTheme(inlineSxTheme, Platform.OS);
    const sxStyledResolved = styledToStyledResolved(
      // @ts-ignore
      inlineSxTheme,
      [],
      componentExtendedConfig
    );

    const sxHash = stableHash(sx);
    const orderedSXResolved =
      styledResolvedToOrderedSXResolved(sxStyledResolved);

    INTERNAL_updateCSSStyleInOrderedResolved(
      orderedSXResolved,
      sxHash,
      false,
      'gs'
    );

    injectComponentAndDescendantStyles(orderedSXResolved, sxHash, type);

    return orderedSXResolved;
  }

  // END BASE COLOR MODE RESOLUTION

  const NewComp = (
    {
      as,
      children,
      //@ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      styledIds: BUILD_TIME_STYLE_IDS,
      ...componentProps
    }: Omit<P, keyof Variants> &
      Partial<ComponentProps<ITypeReactNativeStyles, Variants, P>> &
      Partial<UtilityProps<ITypeReactNativeStyles>> & {
        as?: any;
        children?: any;
      },
    ref: React.ForwardedRef<P>
  ) => {
    const styledContext = useStyled();

    // const componentPropsHash = stableHash(componentProps);

    if (componentStyleConfig.componentName === 'BOX2') {
      // const time = Date.now();
      // console.log(componentPropsHash, "component props here")
      // console.log(Date.now() - time);
      // console.group(
      //   `%cStyledComponent ${DEBUG_TAG}`,
      //   'background: #4b5563; color: #d97706; font-weight: 700; padding: 2px 8px;'
      // );
    }
    const globalStyle = styledContext.globalStyle;

    const CONFIG = {
      ...styledContext.config,
      propertyTokenMap,
    };

    const COLOR_MODE: any = get();

    // console.log('COLOR_MODE HERERERER', COLOR_MODE);

    const styleHashCreatedForColorMode = React.useRef(false);

    if (!styleHashCreated) {
      // GluestackStyleSheet.resolve(CONFIG);
      // GluestackStyleSheet.injectInStyle();
      if (globalStyle) {
        resolvePlatformTheme(globalStyle, Platform.OS);
        theme = {
          ...theme,
          baseStyle: {
            ...globalStyle?.baseStyle,
            ...theme.baseStyle,
          },
          //@ts-ignore
          compoundVariants: [
            ...globalStyle?.compoundVariants,
            //@ts-ignore
            ...theme.compoundVariants,
          ],
          variants: {
            ...globalStyle?.variants,
            ...theme.variants,
          },
        };
      }

      // TODO: can be improved to boost performance
      componentExtendedConfig = CONFIG;
      if (ExtendedConfig) {
        componentExtendedConfig = deepMerge(CONFIG, ExtendedConfig);
      }
      componentStyleIds = styleIds.component;
      componentDescendantStyleIds = styleIds.descendant;

      // console.setStartTimeStamp('setColorModeBaseStyleIds', 'boot');

      styleHashCreated = true;
      /* Boot time */
    }

    // return <Component>{children}</Component>;
    //

    const contextValue = useContext(Context);
    // const STABLEHASH_contextValue = stableHash(contextValue ?? {});

    const {
      passingProps: applyAncestorPassingProps,
      baseStyleCSSIds: applyAncestorBaseStyleCSSIds,
      variantStyleIds: applyAncestorVariantStyleCSSIds,
    } = getAncestorCSSStyleIds(componentStyleConfig, contextValue);

    // 500ms
    const incomingComponentProps = {
      //@ts-ignore
      ...applyAncestorPassingProps, // As applyAncestorPassingProps is incoming props for the descendant component
      ...componentProps,
    };

    const { variantProps } = getVariantProps(
      {
        //@ts-ignore
        ...theme?.baseStyle?.props,
        ...applyAncestorPassingProps,
        ...componentProps,
      },
      theme
    );

    // console.log('hello here ', componentVariantDependencies);
    // const STABLEHASH_variantProps = stableHash(variantProps);

    const sxComponentStyleIds = useRef({});
    const sxDescendantStyleIds = useRef({});
    const sxComponentPassingProps = useRef({});

    // const applySxStyleCSSIds = useRef([]);
    const applySxBaseStyleCSSIds = useRef([]);
    const applySxVariantStyleCSSIds = useRef([]);

    const applySxDescendantStyleCSSIdsAndPropsWithKey = useRef({});

    // const [applySxStateStyleCSSIds, setApplyStateSxStyleCSSIds] = useState([]);
    const [applySxStateBaseStyleCSSIds, setApplyStateSxBaseStyleCSSIds] =
      useState([]);
    const [applySxStateVariantStyleCSSIds, setApplyStateSxVariantStyleCSSIds] =
      useState([]);
    const [
      applySxDescendantStateStyleCSSIdsAndPropsWithKey,
      setApplySxDescendantStateStyleCSSIdsAndPropsWithKey,
    ] = useState({});

    const [componentStatePassingProps, setComponentStatePassingProps] =
      useState({});
    const [sxStatePassingProps, setSxStatePassingProps] = useState({});

    const {
      baseStyleCSSIds: applyBaseStyleCSSIds,
      variantStyleCSSIds: applyVariantStyleCSSIds,
      passingProps: applyComponentPassingProps,
    } = getMergedDefaultCSSIdsAndProps(
      //@ts-ignore
      componentStyleIds,
      variantProps,
      theme,
      incomingComponentProps
    );

    //
    //
    //

    // return <Component>{children}</Component>;

    //
    // passingProps is specific to current component
    const passingProps = deepMergeObjects(
      applyComponentPassingProps,
      componentStatePassingProps,
      sxComponentPassingProps.current,
      sxStatePassingProps
    );

    const { sx: filteredComponentSx, rest: filteredComponentRemainingProps } =
      convertUtiltiyToSXFromProps(
        componentProps,
        componentExtendedConfig,
        componentStyleConfig
      );

    const { sx: filteredPassingSx, rest: filteredPassingRemainingProps } =
      convertUtiltiyToSXFromProps(
        {
          ...passingProps,
          ...applyAncestorPassingProps,
        },
        componentExtendedConfig,
        componentStyleConfig
      );

    // if (componentStyleConfig.DEBUG === 'MYTEXT') {
    //   console.log(
    //     filteredComponentSx,
    //     filteredPassingSx,
    //     // applyAncestorPassingProps,
    //     // applyAncestorBaseStyleCSSIds,
    //     // applyAncestorVariantStyleCSSIds,
    //     componentProps,
    //     '>>>>>'
    //   );
    // }

    const remainingComponentProps = {
      ...filteredPassingRemainingProps,
      ...filteredComponentRemainingProps,
    };

    const { states, ...applyComponentInlineProps }: any =
      remainingComponentProps;

    // const STABLEHASH_states = stableHash(states);
    // 520ms

    // Inline prop based style resolution TODO: Diagram insertion
    const resolvedInlineProps = {};
    if (
      componentStyleConfig.resolveProps &&
      Object.keys(componentExtendedConfig).length > 0
    ) {
      componentStyleConfig.resolveProps.forEach((toBeResovledProp) => {
        if (applyComponentInlineProps[toBeResovledProp]) {
          let value = applyComponentInlineProps[toBeResovledProp];
          if (
            CONFIG.propertyResolver &&
            CONFIG.propertyResolver.props &&
            CONFIG.propertyResolver.props[toBeResovledProp]
          ) {
            let transformer = CONFIG.propertyResolver.props[toBeResovledProp];
            let aliasTokenType = CONFIG.propertyTokenMap[toBeResovledProp];
            let token = transformer(
              value,
              (value1: any, scale = aliasTokenType) =>
                resolveStringToken(
                  value1,
                  CONFIG,
                  CONFIG.propertyTokenMap,
                  toBeResovledProp,
                  scale
                )
            );
            //@ts-ignore
            resolvedInlineProps[toBeResovledProp] = token;
          } else {
            //@ts-ignore
            resolvedInlineProps[toBeResovledProp] =
              getResolvedTokenValueFromConfig(
                componentExtendedConfig,
                applyComponentInlineProps,
                toBeResovledProp,
                applyComponentInlineProps[toBeResovledProp]
              );
          }
          delete applyComponentInlineProps[toBeResovledProp];
        }
      });
    }
    //550ms

    // const { sx, remainingComponentProps } = filterSx(mergedSx, mergedVerboseSx);
    // TODO: filter for inline props like variant and sizes

    // return <Component {...properties} ref={ref} />;
    // 720ms
    const [
      applyComponentStateBaseStyleIds,
      setApplyComponentStateBaseStyleIds,
    ] = useState([]);
    const [
      applyComponentStateVariantStyleIds,
      setApplyComponentStateVariantStyleIds,
    ] = useState([]);

    const applyDescendantsStyleCSSIdsAndPropsWithKey =
      getMergeDescendantsStyleCSSIdsAndPropsWithKey(
        componentDescendantStyleIds,
        variantProps,
        theme,
        incomingComponentProps
      );

    const [
      applyDescendantStateStyleCSSIdsAndPropsWithKey,
      setApplyDescendantStateStyleCSSIdsAndPropsWithKey,
    ] = useState({});
    // 580ms

    // ancestorCSSStyleId

    // const [applySxStyleCSSIds, setApplySxStyleCSSIds] = useState([]);

    // SX resolution

    // const styleTagId = useRef(`style-tag-sx-${stableHash(sx)}`);

    // FOR SX RESOLUTION
    let orderedComponentSXResolved = [];
    let sxStyleIds: any = {};
    if (BUILD_TIME_STYLE_IDS) {
      sxStyleIds = BUILD_TIME_STYLE_IDS;
    } else {
      if (
        Object.keys(filteredComponentSx).length > 0 ||
        Object.keys(filteredPassingSx).length > 0
      ) {
        orderedComponentSXResolved = injectSx(filteredComponentSx, 'inline');

        // console.setEndTimeStamp('INTERNAL_updateCSSStyleInOrderedResolved');
        // console.setStartTimeStamp('injectComponentAndDescendantStyles');

        // console.setEndTimeStamp('injectComponentAndDescendantStyles');
        const orderedPassingSXResolved = injectSx(filteredPassingSx, 'passing');

        const orderedSXResolved = [
          ...orderedPassingSXResolved,
          ...orderedComponentSXResolved,
        ];

        // console.setStartTimeStamp('getStyleIds');
        sxStyleIds = getStyleIds(orderedSXResolved, componentStyleConfig);
      }
    }

    // 550ms

    // Setting variants to sx property for inline variant resolution
    //@ts-ignore
    if (!sxStyleIds.component) {
      sxStyleIds.component = {};
    }
    sxStyleIds.component.variants = componentStyleIds.variants;
    //@ts-ignore
    sxStyleIds.component.compoundVariants = componentStyleIds.compoundVariants;

    // console.setStartTimeStamp('setColorModeBaseStyleIds');
    sxComponentStyleIds.current = sxStyleIds?.component;
    sxDescendantStyleIds.current = sxStyleIds.descendant ?? {};
    //

    // 580ms
    // SX component style
    //@ts-ignore
    const {
      baseStyleCSSIds: sxBaseStyleCSSIds,
      variantStyleCSSIds: sxVariantStyleCSSIds,
      passingProps: sxPassingProps,
    } = getMergedDefaultCSSIdsAndProps(
      //@ts-ignore
      sxComponentStyleIds.current,
      variantProps,
      theme,
      incomingComponentProps
    );

    //@ts-ignore
    // applySxStyleCSSIds.current = sxStyleCSSIds;

    //@ts-ignore

    applySxBaseStyleCSSIds.current = sxBaseStyleCSSIds;
    //@ts-ignore

    applySxVariantStyleCSSIds.current = sxVariantStyleCSSIds;

    sxComponentPassingProps.current = sxPassingProps;
    // SX descendants

    //@ts-ignore
    applySxDescendantStyleCSSIdsAndPropsWithKey.current =
      getMergeDescendantsStyleCSSIdsAndPropsWithKey(
        sxDescendantStyleIds.current,
        variantProps,
        theme,
        incomingComponentProps
      );

    //580ms
    //@ts-ignore
    // applySxStyleCSSIds.current = sxStyleCSSIds;

    //@ts-ignore

    applySxBaseStyleCSSIds.current = sxBaseStyleCSSIds;
    //@ts-ignore

    applySxVariantStyleCSSIds.current = sxVariantStyleCSSIds;

    sxComponentPassingProps.current = sxPassingProps;
    // SX descendants

    //@ts-ignore
    applySxDescendantStyleCSSIdsAndPropsWithKey.current =
      getMergeDescendantsStyleCSSIdsAndPropsWithKey(
        sxDescendantStyleIds.current,
        variantProps,
        theme,
        incomingComponentProps
      );
    const isClient = React.useRef(false);
    const setStateAndColorModeCssIdsAndProps = (
      colorMode: 'light' | 'dark'
    ) => {
      const {
        baseStyleCSSIds: mergedBaseStyleCSSIds,
        variantStyleCSSIds: mergedVariantStyleCSSIds,
        passingProps: stateProps,
      }: any = getMergedStateAndColorModeCSSIdsAndProps(
        //@ts-ignore
        componentStyleIds,
        states,
        variantProps,
        colorMode,
        theme
      );
      // setApplyComponentStateStyleIds(mergedStateIds);

      setApplyComponentStateBaseStyleIds(mergedBaseStyleCSSIds);
      setApplyComponentStateVariantStyleIds(mergedVariantStyleCSSIds);

      setComponentStatePassingProps(stateProps);

      // if (componentStyleConfig?.DEBUG === 'TTTT')

      // for sx props
      const {
        baseStyleCSSIds: mergedSXBaseStyleCSSIds,
        variantStyleCSSIds: mergedSXVariantStyleCSSIds,
        passingProps: mergedSxStateProps,
      }: any = getMergedStateAndColorModeCSSIdsAndProps(
        //@ts-ignore
        sxComponentStyleIds.current,
        states,
        variantProps,
        colorMode,
        theme
      );

      // setApplyStateSxStyleCSSIds(mergedSxStateIds);
      setApplyStateSxBaseStyleCSSIds(mergedSXBaseStyleCSSIds);
      setApplyStateSxVariantStyleCSSIds(mergedSXVariantStyleCSSIds);

      setSxStatePassingProps(mergedSxStateProps);

      // for descendants
      const mergedDescendantsStyle: any = {};
      Object.keys(componentDescendantStyleIds).forEach((key) => {
        const {
          baseStyleCSSIds: descendantBaseStyleCSSIds,
          variantStyleCSSIds: descendantVariantStyleCSSIds,
          passingProps: mergedPassingProps,
        } = getMergedStateAndColorModeCSSIdsAndProps(
          //@ts-ignore

          componentDescendantStyleIds[key],
          states,
          variantProps,
          colorMode,
          theme
        );
        mergedDescendantsStyle[key] = {
          baseStyleCSSIds: descendantBaseStyleCSSIds,
          variantStyleCSSIds: descendantVariantStyleCSSIds,
          passingProps: mergedPassingProps,
        };
      });
      setApplyDescendantStateStyleCSSIdsAndPropsWithKey(mergedDescendantsStyle);

      // for sx descendants
      const mergedSxDescendantsStyle: any = {};
      Object.keys(sxDescendantStyleIds.current).forEach((key) => {
        const {
          baseStyleCSSIds: sxDescendantBaseStyleCSSIds,
          variantStyleCSSIds: sxDescendantVariantStyleCSSIds,
          passingProps: mergedPassingProps,
        } = getMergedStateAndColorModeCSSIdsAndProps(
          //@ts-ignore
          sxDescendantStyleIds.current[key],
          states,
          variantProps,
          colorMode,
          theme
        );
        mergedSxDescendantsStyle[key] = {
          baseStyleCSSIds: sxDescendantBaseStyleCSSIds,
          variantStyleCSSIds: sxDescendantVariantStyleCSSIds,
          passingProps: mergedPassingProps,
        };
      });
      setApplySxDescendantStateStyleCSSIdsAndPropsWithKey(
        mergedSxDescendantsStyle
      );
    };
    if (!isClient.current && states) {
      isClient.current = true;
      setStateAndColorModeCssIdsAndProps(COLOR_MODE);
    }
    // Style ids resolution
    //578ms
    // return <Component>{children}</Component>;

    useEffect(() => {
      onChange((colorMode: any) => {
        // setCOLOR_MODE(colorMode);
        setStateAndColorModeCssIdsAndProps(colorMode);
      });

      // if (styleHashCreatedTimeColorMode !== COLOR_MODE) {
      // }
    }, []);

    if (!styleHashCreatedForColorMode.current) {
      setStateAndColorModeCssIdsAndProps(COLOR_MODE);
      styleHashCreatedForColorMode.current = true;
    }

    useEffect(() => {
      if (states) {
        setStateAndColorModeCssIdsAndProps(COLOR_MODE);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [states]);

    // 600ms
    const descendantCSSIds = useMemo(() => {
      const ids = (() => {
        if (
          applyDescendantsStyleCSSIdsAndPropsWithKey ||
          applyDescendantStateStyleCSSIdsAndPropsWithKey ||
          applySxDescendantStateStyleCSSIdsAndPropsWithKey ||
          applySxDescendantStyleCSSIdsAndPropsWithKey ||
          contextValue
        ) {
          return mergeArraysInObjects(
            applyDescendantsStyleCSSIdsAndPropsWithKey,
            applyDescendantStateStyleCSSIdsAndPropsWithKey,
            applySxDescendantStyleCSSIdsAndPropsWithKey.current,
            applySxDescendantStateStyleCSSIdsAndPropsWithKey,
            contextValue
          );
        } else {
          return {};
        }
      })();
      return ids;
    }, [
      stableHash(applyDescendantsStyleCSSIdsAndPropsWithKey),
      stableHash(applyDescendantStateStyleCSSIdsAndPropsWithKey),
      stableHash(applySxDescendantStateStyleCSSIdsAndPropsWithKey),
      contextValue,
    ]);

    // console.log(applyDescendantsStyleCSSIdsAndPropsWithKey, "key here")

    // if (DEBUG) {
    //   console.log(
    //     '%cDescendant CSS Ids',
    //     'background: #4b5563; color: #16a34a; font-weight: 700; padding: 2px 8px;',
    //     descendantCSSIds
    //   );
    // }

    const styleCSSIds = [
      ...applyBaseStyleCSSIds,
      ...applyAncestorBaseStyleCSSIds,
      ...applyVariantStyleCSSIds,
      ...applyAncestorVariantStyleCSSIds,
      ...applyComponentStateBaseStyleIds,
      ...applyComponentStateVariantStyleIds,
      ...applySxVariantStyleCSSIds.current,
      ...applySxStateBaseStyleCSSIds,
      ...applySxStateVariantStyleCSSIds,
      ...applySxBaseStyleCSSIds.current,
    ];

    // if (DEBUG) {
    //   console.log(
    //     '%cStyle CSS Ids',
    //     'background: #4b5563; color: #16a34a; font-weight: 700; padding: 2px 8px;',
    //     styleCSSIds
    //   );
    // }

    // ----- TODO: Refactor rerendering for Native -----
    // let dimensions;
    // if (Platform.OS !== 'web') {
    //   // eslint-disable-next-line @typescript-eslint/no-unused-vars, react-hooks/rules-of-hooks
    //   dimensions = useWindowDimensions();
    // }

    // Fetch style props from CSS ids

    const applyResolvedInlineProps = {
      ...resolvedInlineProps,
      ...applyComponentInlineProps,
    };
    const resolvedStyleProps = generateStylePropsFromCSSIds(
      applyResolvedInlineProps,
      styleCSSIds,
      CONFIG
      // currentWidth
    );

    const AsComp: any = (as as any) || (passingProps.as as any) || undefined;

    const resolvedStyleMemo = [
      passingProps?.style,
      ...resolvedStyleProps?.style,
    ];

    const component = !AsComp ? (
      <Component {...resolvedStyleProps} style={resolvedStyleMemo} ref={ref}>
        {children}
      </Component>
    ) : (
      <AsComp {...resolvedStyleProps} style={resolvedStyleMemo} ref={ref}>
        {children}
      </AsComp>
    );

    // console.setEndTimeStamp('NewComp');
    if (
      componentStyleConfig?.descendantStyle &&
      componentStyleConfig?.descendantStyle?.length > 0
    ) {
      return (
        <Context.Provider value={descendantCSSIds}>
          {component}
        </Context.Provider>
      );
    }

    // // console.setEndTimeStamp('NewComp');
    // console.groupEnd();
    // // return <Component {...properties} />;
    // // 860ms
    // console.groupEnd();
    // console.groupEnd();
    return component;
  };

  const StyledComp = React.forwardRef(NewComp);
  StyledComp.displayName = Component?.displayName
    ? 'Styled' + Component?.displayName
    : 'StyledComponent';
  // @ts-ignore
  // StyledComp.config = componentStyleConfig;

  // console.groupEnd();
  // console.groupEnd();
  return StyledComp;
}

export function styled<P, Variants>(
  Component: React.ComponentType<P>,
  theme: ITheme<Variants, P>,
  componentStyleConfig?: ConfigType,
  ExtendedConfig?: ExtendedConfigType,
  BUILD_TIME_PARAMS?: {
    orderedResolved: OrderedSXResolved;
    styleIds: {
      component: StyleIds;
      descendant: StyleIds;
    };
    themeHash?: string;
  }
) {
  const DEBUG_TAG = componentStyleConfig?.DEBUG;
  const DEBUG =
    process.env.NODE_ENV === 'development' && DEBUG_TAG ? false : false;

  if (DEBUG) {
    console.group(
      `%cStyled()`,
      'background: #4b5563; color: #d97706; font-weight: 700; padding: 2px 8px;'
    );
    console.log(
      `%c${DEBUG_TAG} theme`,
      'background: #4b5563; color: #16a34a; font-weight: 700; padding: 2px 8px;',
      theme
    );
  }

  const sxConvertedObject = convertStyledToStyledVerbosed(theme);
  const StyledComponent = verboseStyled<P, Variants>(
    Component,
    sxConvertedObject,
    componentStyleConfig,
    ExtendedConfig,
    BUILD_TIME_PARAMS
  );

  return StyledComponent;
}
