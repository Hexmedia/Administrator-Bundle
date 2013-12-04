<?php
namespace Hexmedia\AdministratorBundle\Form\Fields;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\OptionsResolver\OptionsResolverInterface;

/**
 * Class DatepickerType
 * @package Hexmedia\AdministratorBundle\Form\Fields
 */
class ColorType extends AbstractType
{

    public function getParent() {
        return "text";
    }

    /**
     * Returns the name of this type.
     *
     * @return string The name of this type
     */
    public function getName()
    {
        return "color";
    }
}