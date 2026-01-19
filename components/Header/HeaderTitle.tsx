/* eslint-disable react-native/no-inline-styles */
import { useTheme } from "@react-navigation/native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ThemeType } from "../../app/types";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faChevronLeft, faXmark } from "@fortawesome/free-solid-svg-icons";

type HeaderTitleProps = {
  title: string,
  goBack: () => void,
  bottomSheet?: boolean,
};

const HeaderTitle: React.FC<HeaderTitleProps> = ({
  title,
  goBack,
  bottomSheet,
}) => {
  const { colors } = useTheme() as unknown as ThemeType;

  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => goBack()}
        style={[styles.backButton, { borderColor: colors.text }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <FontAwesomeIcon icon={bottomSheet ? faXmark : faChevronLeft} size={22} color={colors.text} />
      </TouchableOpacity>

      <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>

      <View style={{ width: 32 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    marginTop: 5,
    marginHorizontal: 5,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 0.2,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
  },
});

export default HeaderTitle;