<?php

namespace Hexmedia\AdministratorBundle\Twig\Node;

/**
 * @author Krystian Kuczek <krystian@hexmedia.pl>
 */
class ContentNode extends \Twig_Node
{
    /**
     * @param string $type
     * @param string $var
     * @param int $field
     * @param \Twig_Node $tag
     * @param \Twig_Node $class
     * @param \Twig_Node $language
     * @param int $lineNumber
     * @param null $tag2
     */
    public function __construct(
        $type,
        $var,
        $field,
        \Twig_Node $tag = null,
        \Twig_Node $class = null,
        \Twig_Node $language = null,
        $lineNumber = 0,
        $tag2 = null
    ) {
        parent::__construct(
            ['class' => $class, 'tag' => $tag, 'language' => $language],
            ['type' => $type, 'field' => $field, 'var' => $var],
            $lineNumber,
            $tag2
        );
    }

    /**
     * {@inheritdoc}
     */
    public function compile(\Twig_Compiler $compiler)
    {
        $classNode = $this->getNode("class");
        $tagNode = $this->getNode("tag");
        $languageNode = $this->getNode("language");

        $compiler->write(
            'echo($this->env->getExtension(\'content_extension\')->get(
                            $context[\'' . $this->getAttribute('var') . '\'],
                \'' . $this->getAttribute('type') . '\',
                \'' . $this->getAttribute('field') . '\''
        );

        if ($tagNode instanceof \Twig_Node) {
            $compiler->write(",");
            $compiler->subcompile($tagNode);
        } else {
            $compiler->write(", null");
        }

        if ($classNode instanceof \Twig_Node) {
            $compiler->write(",");
            $compiler->subcompile($classNode);
        } else {
            $compiler->write(", null");
        }

        if ($languageNode instanceof \Twig_Node) {
            $compiler->write(",");
            $compiler->subcompile($languageNode);
        } else {
            $compiler->write(", null");
        }

        $compiler->write(
            '));'
        );
    }
}
