import { ReactNode } from "react"
import { View } from "react-native"
import { useTheme } from '@react-navigation/native'
import { ThemeType } from "../app/types/ThemeType"
import ZingoLogoImage from "./ZingoLogoImage"

type HeaderProps = {
    children: ReactNode
}


const Header: React.FunctionComponent<HeaderProps> = (props) => {
    // TODO: why?
    const { colors } = useTheme() as unknown as ThemeType
    console.log(colors)

    console.log("THEME", useTheme())

    return (
        <View
            style={{
                display: 'flex',
                alignItems: 'center',
                // paddingBottom: 10,
                // backgroundColor: colors.card ||,
                // zIndex: -1,
                // paddingTop: 10,
            }}>
            <ZingoLogoImage />
            {props.children}
            <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />
        </View>
    )
}

export default Header
