import { Dimensions, Platform } from 'react-native';
import { GluestackStyleSheet } from './style-sheet';

export function getClosestBreakpoint(
  values: Record<string, any>,
  point: number
) {
  const dimValues = Object.values(values);
  let index = -1;
  let breakpointsObj: any = {};
  for (let i = 0; i < dimValues.length; i++) {
    breakpointsObj[dimValues[i]] = i;
  }
  const breakpoints = Object.keys(breakpointsObj);

  for (let i = 0; i < breakpoints.length; i++) {
    if (parseInt(breakpoints[i]) === point) {
      index = breakpointsObj[breakpoints[i]];
      break;
    } else if (parseInt(breakpoints[i]) > point && i !== 0) {
      index = breakpointsObj[breakpoints[i - 1]];
      break;
    }
    // If windowWidth is greater than last available breakpoint clamp it to last index
    else if (parseInt(breakpoints[i]) < point && i === dimValues.length - 1) {
      index = breakpointsObj[breakpoints[i]];
      break;
    }
  }
  return breakpoints[index];
}

function getMinWidthFromMediaQuery(mediaQuery: string) {
  const regex = /\(\s*min-width:\s*(\d+)px\s*\)/;
  const matches = regex.exec(mediaQuery);
  if (matches) {
    return parseInt(matches[1], 10);
  }
  return 0;
}

export function getClosestBreakpointValue(
  mediaQueries: Record<string, any>,
  value: number
) {
  if (!mediaQueries) return;

  const dimValues = Object.values(mediaQueries);
  let index: any = -1;

  let breakpointsObj: any = {};
  for (let i = 0; i < dimValues.length; i++) {
    const minWidth = getMinWidthFromMediaQuery(dimValues[i]);
    breakpointsObj[minWidth] = dimValues[i];
  }

  const breakpoints = Object.keys(breakpointsObj);
  for (let i = 0; i < breakpoints.length; i++) {
    if (parseInt(breakpoints[i]) === value) {
      index = breakpoints[i];
      break;
    } else if (parseInt(breakpoints[i]) > value && i !== 0) {
      index = breakpoints[i - 1];
      break;
    }
    // If windowWidth is greater than last available breakpoint clamp it to last index
    else if (parseInt(breakpoints[i]) < value && i === dimValues.length - 1) {
      index = breakpoints[i];
      break;
    }
  }

  return index;
}

function getWidthFromMediaQuery(condition: string) {
  var match = condition.match(/\(min-width:\s*(\d+)px\)/);
  if (match) {
    return parseInt(match[1]);
  } else {
    return null;
  }
}

function isValidBreakpoint(config: any, queryCondition: any) {
  const windowWidth = Dimensions.get('window')?.width;

  const currentBreakpointValue = getClosestBreakpointValue(
    config.tokens.mediaQueries,
    windowWidth
  );

  if (
    getWidthFromMediaQuery(queryCondition) !== null &&
    // @ts-ignore
    getWidthFromMediaQuery(queryCondition) <= currentBreakpointValue
  ) {
    return true;
  }

  return false;
}

function getDataStyle(props: any, styleCSSIdsString: string) {
  if (Platform.OS === 'web') {
    if (props?.dataSet?.style && props?.['data-style']) {
      return (
        props['data-style'] +
        ' ' +
        props.dataSet.style +
        ' ' +
        styleCSSIdsString
      );
    } else if (props?.dataSet?.style) {
      return props.dataSet.style + ' ' + styleCSSIdsString;
    } else if (props?.['data-style']) {
      return props['data-style'] + ' ' + styleCSSIdsString;
    } else {
      return styleCSSIdsString;
    }
  } else {
    return '';
  }
}
export function generateStylePropsFromCSSIds(
  props: any,
  styleCSSIds: any,
  config: any
) {
  // console.setStartTimeStamp('generateStylePropsFromCSSIds');
  const propsStyles = Array.isArray(props?.style)
    ? props?.style
    : [props?.stlye];

  // console.log(styleCSSIds, 'style css id');
  // for RN
  const styleObj: any = [];
  let styleCSSIdsString: any = '';

  if (Platform.OS !== 'web') {
    const nativeStyleMap = GluestackStyleSheet.getStyleMap();
    styleCSSIds.forEach((cssId: any) => {
      const nativeStyle = nativeStyleMap.get(cssId);

      if (nativeStyle) {
        const queryCondition = nativeStyle?.meta?.queryCondition;
        const styleSheetIds = nativeStyle?.value;
        const styleSheet = styleSheetIds; /* Object.keys(styleSheetIds).map(
          (currentStyle) => styleSheetIds[currentStyle]
        ); /* StyleSheet.flatten(
          Object.keys(styleSheetIds).map(
            (currentStyle) => styleSheetIds[currentStyle]
          )
        ); */

        if (queryCondition) {
          if (isValidBreakpoint(config, queryCondition)) {
            styleObj.push(styleSheet);
          }
        } else {
          styleObj.push(styleSheet);
        }
      }
    });
  } else {
    styleCSSIdsString = styleCSSIds.join(' ');
  }

  // console.setEndTimeStamp('generateStylePropsFromCSSIds');
  // return props;
  return {
    ...props,
    'dataSet': {
      ...props.dataSet,
      // TODO: this below line causes recalculate style on web
      style: getDataStyle(props, styleCSSIdsString),
    },
    'data-style': getDataStyle(props, styleCSSIdsString),
    'style': propsStyles ? [...styleObj, ...propsStyles] : styleObj,
  };
}
