pub fn display_label(value: &str) -> String {
    value.to_owned()
}

#[cfg(test)]
mod tests {
    #[test]
    fn nonempty_label_is_preserved() {
        assert_eq!(super::display_label("A-12"), "A-12");
    }
}
