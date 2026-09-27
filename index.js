import { findByProps, findByName } from "@vendetta/metro";
import { React, ReactNative } from "@vendetta/metro/common";
import { after, before } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { Forms } from "@vendetta/ui/components";

const { FormRow, FormSwitch, FormSection, FormInput } = Forms;
const { Animated, TouchableOpacity, LayoutAnimation, UIManager, Platform } = ReactNative;

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

storage.enabled ??= true;
storage.messageFade ??= true;
storage.buttonScale ??= true;
storage.duration ??= 250;

const patches = [];

export default {
  onLoad: () => {
    if (!storage.enabled) return;

    // --- Message fade-in ---
    try {
      const Message = findByName("Message", false) || findByProps("MessageContent");
      if (Message) {
        patches.push(
          after("default", Message, (args, ret) => {
            if (!storage.messageFade || !ret) return ret;

            const opacity = new Animated.Value(0);

            Animated.timing(opacity, {
              toValue: 1,
              duration: Number(storage.duration) || 250,
              useNativeDriver: true,
            }).start();

            return React.createElement(
              Animated.View,
              { style: { opacity } },
              ret
            );
          })
        );
      }
    } catch (e) {
      console.log("[UIAnimations] Message patch failed:", e);
    }

    // --- Button press scale ---
    try {
      if (storage.buttonScale) {
        patches.push(
          after("render", TouchableOpacity.prototype, function (args, ret) {
            if (!ret) return ret;

            const scale = new Animated.Value(1);

            const onPressIn = () => {
              Animated.spring(scale, {
                toValue: 0.92,
                useNativeDriver: true,
                speed: 50,
                bounciness: 4,
              }).start();
            };

            const onPressOut = () => {
              Animated.spring(scale, {
                toValue: 1,
                useNativeDriver: true,
                speed: 50,
                bounciness: 4,
              }).start();
            };

            const originalOnPressIn = ret.props.onPressIn;
            const originalOnPressOut = ret.props.onPressOut;

            ret.props.onPressIn = (...a) => {
              onPressIn();
              originalOnPressIn?.(...a);
            };
            ret.props.onPressOut = (...a) => {
              onPressOut();
              originalOnPressOut?.(...a);
            };

            return React.createElement(
              Animated.View,
              { style: { transform: [{ scale }] } },
              ret
            );
          })
        );
      }
    } catch (e) {
      console.log("[UIAnimations] Button scale patch failed:", e);
    }

    // --- Navigation transition smoothing ---
    try {
      const Navigation = findByProps("navigate", "goBack");
      if (Navigation) {
        patches.push(
          before("navigate", Navigation, () => {
            LayoutAnimation.configureNext(
              LayoutAnimation.create(
                Number(storage.duration) || 250,
                LayoutAnimation.Types.easeInEaseOut,
                LayoutAnimation.Properties.opacity
              )
            );
          })
        );
      }
    } catch (e) {
      console.log("[UIAnimations] Navigation patch failed:", e);
    }

    console.log("[UIAnimations] Loaded");
  },

  onUnload: () => {
    patches.forEach((unpatch) => unpatch?.());
    patches.length = 0;
    console.log("[UIAnimations] Unloaded");
  },

  settings: () => {
    const [enabled, setEnabled] = React.useState(storage.enabled);
    const [messageFade, setMessageFade] = React.useState(storage.messageFade);
    const [buttonScale, setButtonScale] = React.useState(storage.buttonScale);
    const [duration, setDuration] = React.useState(String(storage.duration ?? 250));

    return React.createElement(
      React.Fragment,
      null,
      React.createElement(
        FormSection,
        { title: "Загальні" },
        React.createElement(FormRow, {
          label: "Увімкнути плагін",
          trailing: React.createElement(FormSwitch, {
            value: enabled,
            onValueChange: (v) => {
              storage.enabled = v;
              setEnabled(v);
            },
          }),
        }),
        React.createElement(FormRow, {
          label: "Fade повідомлень",
          subLabel: "Плавна поява нових повідомлень",
          trailing: React.createElement(FormSwitch, {
            value: messageFade,
            onValueChange: (v) => {
              storage.messageFade = v;
              setMessageFade(v);
            },
          }),
        }),
        React.createElement(FormRow, {
          label: "Scale кнопок",
          subLabel: "Легке зменшення при натисканні",
          trailing: React.createElement(FormSwitch, {
            value: buttonScale,
            onValueChange: (v) => {
              storage.buttonScale = v;
              setButtonScale(v);
            },
          }),
        })
      ),
      React.createElement(
        FormSection,
        { title: "Швидкість" },
        React.createElement(FormInput, {
          title: "Тривалість анімації (мс)",
          value: duration,
          keyboardType: "numeric",
          onChange: (v) => {
            const num = parseInt(v, 10) || 250;
            storage.duration = num;
            setDuration(String(num));
          },
        })
      ),
      React.createElement(
        FormSection,
        { title: "Примітка" },
        React.createElement(FormRow, {
          label: "Після зміни налаштувань перезавантаж Discord (або вимкни/увімкни плагін)",
        })
      )
    );
  },
};
