/*
 * The component catalogue. Importing this module registers every built-in node
 * type into the SDUI registry. A module or future package can call register()
 * with its own types to extend the vocabulary without touching this file.
 */

import { registerAll } from "@/sdui/registry";

import { Screen, Section, Carousel, Grid, Stack, Tabs, Divider, Spacer } from "./layout";
import {
  Button,
  IconButton,
  Menu,
  SearchBar,
  TextField,
  Toggle,
  Select,
  Slider,
  RatingControl,
  ProgressBar,
  Pagination,
} from "./controls";
import {
  PosterCard,
  HeroBanner,
  EpisodeRow,
  DetailHeader,
  SeasonSelector,
  RelatedRail,
  SourcePicker,
  PlaybackBar,
  PersonChip,
  GenreTag,
} from "./media";
import { Skeleton, EmptyState, ErrorState, Banner, Badge, StatusIndicator } from "./feedback";

let installed = false;

/** Idempotently register all built-in components. Call once at boot. */
export function installComponents(): void {
  if (installed) return;
  installed = true;
  registerAll({
    // layout
    Screen,
    Section,
    Carousel,
    Grid,
    Stack,
    Tabs,
    Divider,
    Spacer,
    // controls
    Button,
    IconButton,
    Menu,
    SearchBar,
    TextField,
    Toggle,
    Select,
    Slider,
    RatingControl,
    ProgressBar,
    Pagination,
    // media
    PosterCard,
    HeroBanner,
    EpisodeRow,
    DetailHeader,
    SeasonSelector,
    RelatedRail,
    SourcePicker,
    PlaybackBar,
    PersonChip,
    GenreTag,
    // feedback
    Skeleton,
    EmptyState,
    ErrorState,
    Banner,
    Badge,
    StatusIndicator,
  });
}
