package parser

import (
	"errors"
	"io"
	"math"
	"regexp"
	"strconv"
	"strings"

	"github.com/pektezol/bitreader"
)

type Result struct {
	MapID          int
	ServerNumber   int
	PortalCount    int
	TickCount      int
	HostSteamID    string
	PartnerSteamID string
	IsHost         bool
}

// Don't try to understand it, feel it.
func ProcessDemo(demoFile io.Reader) (Result, error) {
	var result Result
	reader := bitreader.NewReader(demoFile, true)
	demoFileStamp := reader.TryReadString()
	demoProtocol := reader.TryReadSInt32()
	networkProtocol := reader.TryReadSInt32()
	serverName := reader.TryReadStringLength(260)
	// clientName := reader.TryReadStringLength(260)
	reader.SkipBytes(260)
	mapName := reader.TryReadStringLength(260)
	reader.SkipBytes(276)
	if demoFileStamp != "HL2DEMO" {
		return Result{}, errors.New("Invalid demo file stamp.")
	}
	if demoProtocol != 4 {
		return Result{}, errors.New("Invalid demo protocol.")
	}
	if networkProtocol != 2001 {
		return Result{}, errors.New("Invalid network protocol.")
	}
	if mapDict[mapName] == 0 {
		return Result{}, errors.New("Invalid map.")
	}
	result.MapID = mapDict[mapName]
	for {
		packetType := reader.TryReadUInt8()
		reader.SkipBits(40)
		switch packetType {
		case 1:
			reader.SkipBytes(160)
			reader.SkipBytes(uint64(reader.TryReadSInt32()))
		case 2:
			reader.SkipBytes(160)
			size := reader.TryReadUInt32()
			packetReader := bitreader.NewReaderFromBytes(reader.TryReadBytesToSlice(uint64(size)), true)
			for {
				messageType, err := packetReader.ReadBits(6)
				if err != nil {
					break
				}
				switch messageType {
				case 0:
				case 1:
					packetReader.TryReadString()
				case 2:
					packetReader.SkipBytes(4)
					packetReader.TryReadString()
					packetReader.SkipBits(2)
				case 3:
					packetReader.SkipBits(1)
				case 4:
					packetReader.SkipBytes(8)
				case 5:
					packetReader.TryReadString()
				case 6:
					length := int(packetReader.TryReadUInt8())
					for count := 0; count < length; count++ {
						packetReader.TryReadString()
						packetReader.TryReadString()
					}
				case 7:
					packetReader.SkipBytes(9)
					idsLength := packetReader.TryReadUInt32()
					if idsLength > 0 {
						packetReader.SkipBytes(uint64(idsLength))
					}
					mapLength := packetReader.TryReadUInt32()
					if mapLength > 0 {
						packetReader.TryReadStringLength(uint64(mapLength))
					}
				case 8:
					packetReader.SkipBits(210)
					packetReader.TryReadStringLength(1)
					packetReader.TryReadString()
					packetReader.TryReadString()
					packetReader.TryReadString()
					packetReader.TryReadString()
				case 9:
					packetReader.SkipBits(1)
					packetReader.SkipBits(uint64(packetReader.TryReadUInt8()))
				case 10:
					classCount := packetReader.TryReadUInt16()
					if !packetReader.TryReadBool() {
						for count := 0; count < int(classCount); count++ {
							packetReader.SkipBits(uint64(math.Log2(float64(classCount)) + 1))
							packetReader.TryReadString()
							packetReader.TryReadString()
						}
					}
				case 11:
					packetReader.SkipBits(1)
				case 12:
					packetReader.TryReadString()
					maxEntries := packetReader.TryReadSInt16()
					packetReader.SkipBits(uint64(math.Log2(float64(maxEntries))) + 1)
					length := packetReader.TryReadBits(20)
					if packetReader.TryReadBool() {
						packetReader.SkipBytes(2)
					}
					packetReader.SkipBits(2)
					packetReader.SkipBits(length)
				case 13:
					packetReader.SkipBits(5)
					if packetReader.TryReadBool() {
						packetReader.SkipBytes(2)
					}
					packetReader.SkipBits(packetReader.TryReadBits(20))
				case 14:
					packetReader.TryReadString()
					if packetReader.TryReadUInt8() == 255 {
						packetReader.SkipBytes(4)
					}
				case 15:
					packetReader.SkipBytes(2)
					packetReader.SkipBits(uint64(packetReader.TryReadUInt16()))
				case 16:
					print := packetReader.TryReadString()
					re := regexp.MustCompile(`Server Number: (\d+)`)
					match := re.FindStringSubmatch(print)
					if len(match) >= 1 {
						serverNumber := match[1]
						n, err := strconv.Atoi(serverNumber)
						if err != nil {
							return Result{}, err
						}
						result.ServerNumber = n
					}
				case 17:
					var length uint16
					if packetReader.TryReadBool() {
						length = uint16(packetReader.TryReadUInt8())
					} else {
						packetReader.SkipBytes(1)
						length = packetReader.TryReadUInt16()
					}
					packetReader.SkipBits(uint64(length))
				case 18:
					packetReader.SkipBits(11)
				case 19:
					packetReader.SkipBits(49)
				case 20:
					packetReader.SkipBits(48)
				case 21:
					readVectorCoord := func() float32 {
						value := float32(0)
						integer := packetReader.TryReadBits(1)
						fraction := packetReader.TryReadBits(1)
						if integer != 0 || fraction != 0 {
							sign := packetReader.TryReadBits(1)
							if integer != 0 {
								integer = packetReader.TryReadBits(uint64(14)) + 1
							}
							if fraction != 0 {
								fraction = packetReader.TryReadBits(uint64(5))
							}
							value = float32(integer) + float32(fraction)*(1.0/float32(1<<5))
							if sign != 0 {
								value = -value
							}
						}
						return value
					}
					packetReader.SkipBits(3)
					readVectorCoord()
					readVectorCoord()
					readVectorCoord()
					packetReader.SkipBits(9)
					if packetReader.TryReadBool() {
						packetReader.SkipBits(22)
					}
					packetReader.SkipBits(1)
				case 22:
					packetReader.SkipBits(1)
					packetReader.SkipBits(packetReader.TryReadBits(11))
				case 23:
					msgType := int8(packetReader.TryReadBits(8))
					msgLength := packetReader.TryReadBits(12)
					userMessageReader := bitreader.NewReaderFromBytes(packetReader.TryReadBitsToSlice(msgLength), true)
					switch msgType {
					case 60:
						scoreboardTempUpdate := struct {
							NumPortals int32
							TimeTaken  int32
						}{
							NumPortals: userMessageReader.TryReadSInt32(),
							TimeTaken:  userMessageReader.TryReadSInt32(),
						}
						result.PortalCount = int(scoreboardTempUpdate.NumPortals)
						result.TickCount = int(math.Round(float64((float32(scoreboardTempUpdate.TimeTaken) / 100.0) / float32(1.0/60.0))))
					}
				case 24:
					packetReader.SkipBits(20)
					packetReader.SkipBits(packetReader.TryReadBits(11))
				case 25:
					packetReader.SkipBits(packetReader.TryReadBits(11))
				case 26:
					packetReader.SkipBits(11)
					if packetReader.TryReadBool() {
						packetReader.SkipBytes(4)
					}
					packetReader.SkipBits(12)
					length := packetReader.TryReadBits(20)
					packetReader.SkipBits(1)
					packetReader.SkipBits(length)

				case 27:
					packetReader.SkipBits(8)
					packetReader.SkipBits(packetReader.TryReadBits(17))
				case 28:
					packetReader.SkipBits(13)
				case 29:
					packetReader.SkipBits(16)
					packetReader.SkipBits(packetReader.TryReadBits(32))
				case 30:
					packetReader.SkipBits(9)
					packetReader.SkipBits(packetReader.TryReadBits(20))
				case 31:
					packetReader.SkipBits(32)
					packetReader.TryReadString()
				case 32:
					packetReader.SkipBytes(packetReader.TryReadBits(32))
				case 33:
					packetReader.SkipBits(packetReader.TryReadBits(32))
					// default:
					// 	return Result{}, errors.New(fmt.Sprintf("unknown msg type %d", messageType))
				}
			}
		case 3, 7:
		case 4, 6:
			reader.SkipBytes(uint64(reader.TryReadSInt32()))
		case 5, 8:
			reader.SkipBits(32)
			reader.SkipBytes(uint64(reader.TryReadSInt32()))
		case 9:
			type StringTableClass struct {
				Name string
				Data string
			}
			type StringTableEntry struct {
				Name      string
				EntryData any
			}
			type StringTable struct {
				Name         string
				TableEntries []StringTableEntry
				Classes      []StringTableClass
			}
			size := reader.TryReadSInt32()
			stringTableReader := bitreader.NewReaderFromBytes(reader.TryReadBytesToSlice(uint64(size)), true)
			tableCount := stringTableReader.TryReadBits(8)
			guidCount := 0
			for i := 0; i < int(tableCount); i++ {
				tableName := stringTableReader.TryReadString()
				entryCount := stringTableReader.TryReadBits(16)
				for i := 0; i < int(entryCount); i++ {
					stringTableReader.TryReadString()
					if stringTableReader.TryReadBool() {
						byteLen, err := stringTableReader.ReadBits(16)
						if err != nil {
							return Result{}, errors.New("error on reading entry length")
						}
						stringTableEntryReader := bitreader.NewReaderFromBytes(stringTableReader.TryReadBytesToSlice(byteLen), true)
						if tableName == "userinfo" {
							const SignedGuidLen int32 = 32
							const MaxPlayerNameLength int32 = 32
							userInfo := struct {
								SteamID         uint64
								Name            string
								UserID          int32
								GUID            string
								FriendsID       uint32
								FriendsName     string
								FakePlayer      bool
								IsHltv          bool
								CustomFiles     []uint32
								FilesDownloaded uint8
							}{
								SteamID: stringTableEntryReader.TryReadUInt64(),
								Name:    stringTableEntryReader.TryReadStringLength(uint64(MaxPlayerNameLength)),
								UserID:  stringTableEntryReader.TryReadSInt32(),
								GUID:    stringTableEntryReader.TryReadStringLength(uint64(SignedGuidLen) + 1),
							}
							stringTableEntryReader.SkipBytes(3)
							userInfo.FriendsID = stringTableEntryReader.TryReadUInt32()
							userInfo.FriendsName = stringTableEntryReader.TryReadStringLength(uint64(MaxPlayerNameLength))
							userInfo.FakePlayer = stringTableEntryReader.TryReadUInt8() != 0
							userInfo.IsHltv = stringTableEntryReader.TryReadUInt8() != 0
							stringTableEntryReader.SkipBytes(2)
							userInfo.CustomFiles = []uint32{stringTableEntryReader.TryReadUInt32(), stringTableEntryReader.TryReadUInt32(), stringTableEntryReader.TryReadUInt32(), stringTableEntryReader.TryReadUInt32()}
							userInfo.FilesDownloaded = stringTableEntryReader.TryReadUInt8()
							stringTableEntryReader.SkipBytes(3)
							if guidCount == 0 {
								result.HostSteamID = userInfo.GUID
								if strings.Contains(serverName, "localhost") {
									result.IsHost = true
								}
							} else if guidCount == 1 {
								result.PartnerSteamID = userInfo.GUID
							}
							guidCount++
						}
					}
				}
				if stringTableReader.TryReadBool() {
					classCount := stringTableReader.TryReadBits(16)
					for i := 0; i < int(classCount); i++ {
						stringTableReader.TryReadString()
						if stringTableReader.TryReadBool() {
							stringTableReader.TryReadStringLength(uint64(stringTableReader.TryReadUInt16()))
						}
					}
				}
			}
		default:
			return Result{}, errors.New("invalid packet type")
		}
		if packetType == 7 {
			break
		}
	}
	return result, nil
}

var mapDict = map[string]int{
	"sp_a1_intro1": 1,
	"sp_a1_intro2": 2,
	"sp_a1_intro3": 3,
	"sp_a1_intro4": 4,
	"sp_a1_intro5": 5,
	"sp_a1_intro6": 6,
	"sp_a1_intro7": 7,
	"sp_a1_wakeup": 8,
	"sp_a2_intro":  9,

	"sp_a2_laser_intro":    10,
	"sp_a2_laser_stairs":   11,
	"sp_a2_dual_lasers":    12,
	"sp_a2_laser_over_goo": 13,
	"sp_a2_catapult_intro": 14,
	"sp_a2_trust_fling":    15,
	"sp_a2_pit_flings":     16,
	"sp_a2_fizzler_intro":  17,

	"sp_a2_sphere_peek":     18,
	"sp_a2_ricochet":        19,
	"sp_a2_bridge_intro":    20,
	"sp_a2_bridge_the_gap":  21,
	"sp_a2_turret_intro":    22,
	"sp_a2_laser_relays":    23,
	"sp_a2_turret_blocker":  24,
	"sp_a2_laser_vs_turret": 25,
	"sp_a2_pull_the_rug":    26,

	"sp_a2_column_blocker": 27,
	"sp_a2_laser_chaining": 28,
	"sp_a2_triple_laser":   29,
	"sp_a2_bts1":           30,
	"sp_a2_bts2":           31,

	"sp_a2_bts3": 32,
	"sp_a2_bts4": 33,
	"sp_a2_bts5": 34,
	"sp_a2_core": 35,

	"sp_a3_01":           36,
	"sp_a3_03":           37,
	"sp_a3_jump_intro":   38,
	"sp_a3_bomb_flings":  39,
	"sp_a3_crazy_box":    40,
	"sp_a3_transition01": 41,

	"sp_a3_speed_ramp":   42,
	"sp_a3_speed_flings": 43,
	"sp_a3_portal_intro": 44,
	"sp_a3_end":          45,

	"sp_a4_intro":          46,
	"sp_a4_tb_intro":       47,
	"sp_a4_tb_trust_drop":  48,
	"sp_a4_tb_wall_button": 49,
	"sp_a4_tb_polarity":    50,
	"sp_a4_tb_catch":       51,
	"sp_a4_stop_the_box":   52,
	"sp_a4_laser_catapult": 53,
	"sp_a4_laser_platform": 54,
	"sp_a4_speed_tb_catch": 55,
	"sp_a4_jump_polarity":  56,

	"sp_a4_finale1": 57,
	"sp_a4_finale2": 58,
	"sp_a4_finale3": 59,
	"sp_a4_finale4": 60,

	"mp_coop_start":   61,
	"mp_coop_lobby_3": 62,

	"mp_coop_doors":         63,
	"mp_coop_race_2":        64,
	"mp_coop_laser_2":       65,
	"mp_coop_rat_maze":      66,
	"mp_coop_laser_crusher": 67,
	"mp_coop_teambts":       68,

	"mp_coop_fling_3":           69,
	"mp_coop_infinifling_train": 70,
	"mp_coop_come_along":        71,
	"mp_coop_fling_1":           72,
	"mp_coop_catapult_1":        73,
	"mp_coop_multifling_1":      74,
	"mp_coop_fling_crushers":    75,
	"mp_coop_fan":               76,

	"mp_coop_wall_intro":          77,
	"mp_coop_wall_2":              78,
	"mp_coop_catapult_wall_intro": 79,
	"mp_coop_wall_block":          80,
	"mp_coop_catapult_2":          81,
	"mp_coop_turret_walls":        82,
	"mp_coop_turret_ball":         83,
	"mp_coop_wall_5":              84,

	"mp_coop_tbeam_redirect":      85,
	"mp_coop_tbeam_drill":         86,
	"mp_coop_tbeam_catch_grind_1": 87,
	"mp_coop_tbeam_laser_1":       88,
	"mp_coop_tbeam_polarity":      89,
	"mp_coop_tbeam_polarity2":     90,
	"mp_coop_tbeam_polarity3":     91,
	"mp_coop_tbeam_maze":          92,
	"mp_coop_tbeam_end":           93,

	"mp_coop_paint_come_along":     94,
	"mp_coop_paint_redirect":       95,
	"mp_coop_paint_bridge":         96,
	"mp_coop_paint_walljumps":      97,
	"mp_coop_paint_speed_fling":    98,
	"mp_coop_paint_red_racer":      99,
	"mp_coop_paint_speed_catch":    100,
	"mp_coop_paint_longjump_intro": 101,

	"mp_coop_separation_1":     102,
	"mp_coop_tripleaxis":       103,
	"mp_coop_catapult_catch":   104,
	"mp_coop_2paints_1bridge":  105,
	"mp_coop_paint_conversion": 106,
	"mp_coop_bridge_catch":     107,
	"mp_coop_laser_tbeam":      108,
	"mp_coop_paint_rat_maze":   109,
	"mp_coop_paint_crazy_box":  110,
}
